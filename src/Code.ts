import {Scenario, ScenarioWithExecuteResult} from "./Scenarios"
import oauth from "./OAuth"
import {Constants} from "./Constants"
import SimpleHttpClient from "./SimpleHttpClient"
import {getLastScenarioExecute, getLastUpdatedBy, getRelationPlans, isExistsDataTable} from "./ScenarioScraping"
import AUTIFY_API_URL = Constants.AUTIFY_API_URL;
import START_BODY_ROW = Constants.START_BODY_ROW;
import CompareToIndex = Constants.CompareToIndex;

const SHEET = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('scenarios') || SpreadsheetApp.getActiveSpreadsheet().insertSheet('scenarios')
const START_TIME = new Date().getTime()
const createOptions = () => {
    const bearerKey = PropertiesService.getScriptProperties().getProperty("KEY")
    const headers: GoogleAppsScript.URL_Fetch.HttpHeaders = {
        'Authorization': `Bearer ${bearerKey}`
    }
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        'method': 'get',
        'headers': headers,
        "muteHttpExceptions": true
    }
    return options
}

const resume = () => {
    const scriptProperties = PropertiesService.getScriptProperties()
    const resumePageNumber = Number(scriptProperties.getProperty(Constants.RESUME_PAGE_KEY))
    update(false, resumePageNumber)
    if (isNeedContinueInBackground())
        setResumeTrigger(resumePageNumber)
    else
        deleteResumeTrigger()
}

const isNeedContinueInBackground = (): boolean => new Date().getTime() - START_TIME >= Constants.MAX_EXECUTION_TIME

const setResumeTrigger = (pageNumber: number) => {
    const scriptProperties = PropertiesService.getScriptProperties()
    scriptProperties.setProperty(Constants.RESUME_PAGE_KEY, pageNumber.toString())
    ScriptApp.newTrigger(Constants.RESUME_TRIGGER_NAME).timeBased().after(Constants.DELAY_TIME).create()
}

const deleteResumeTrigger = () => {
    const scriptProperties = PropertiesService.getScriptProperties()
    scriptProperties.deleteProperty(Constants.RESUME_PAGE_KEY)
    const triggers = ScriptApp.getProjectTriggers()
    triggers.forEach(t => {
        if (t.getHandlerFunction() === Constants.RESUME_TRIGGER_NAME) ScriptApp.deleteTrigger(t)
    })
}

const getScenarios = (page: number) => {
    const options = createOptions()
    const params: { [key: string]: any } = {'page': page}
    const queryParam = Object.keys(params).map(k => `${k}=${params[k]}`).join('&')
    const responseText = UrlFetchApp.fetch(`${AUTIFY_API_URL}/scenarios?${queryParam}`, options).getContentText()
    return JSON.parse(responseText) as Scenario[]
}

const getScenario = (id: number) => {
    const options = createOptions()
    const httpResponse = UrlFetchApp.fetch(`${AUTIFY_API_URL}/scenarios/${id}`, options)
    if (httpResponse.getResponseCode() === 404) return null
    const responseText = httpResponse.getContentText()
    return JSON.parse(responseText) as Scenario
}

const update = (forceUpdate: boolean, externalPage: number = 0) => {
    const currentValues = SHEET.getSheetValues(START_BODY_ROW, 1, SHEET.getLastRow(), Constants.SYNC_LAST_COLUMN)
    const client = new SimpleHttpClient()
    oauth(client)
    let page = externalPage === 0 ? 1 : externalPage
    while (true) {
        if (isNeedContinueInBackground()) {
            setResumeTrigger(page)
            return
        }
        const scenarios = getScenarios(page)
        if (scenarios.length === 0) return
        scenarios.forEach(s => complementScenarioAndWrite(currentValues, new Scenario(s), client, forceUpdate))
        page++
    }
}

const updateFromUI = (forceUpdate: boolean = false) => {
    const ui = SpreadsheetApp.getUi()
    const button = ui.alert(`${forceUpdate ? '[強制]' : ''}シナリオ 更新・取得`, '実行しますか', ui.ButtonSet.YES_NO)
    if (button !== ui.Button.YES) return
    update(forceUpdate)
    if (isNeedContinueInBackground()) {
        ui.alert('実行時間が最大値を超えたため、バックグラウンドで実行を継続します。')
    }
}

const REGEX_ID = /^\d+$/
const REGEX_RANGE = /^\s*(\d*)\s*(<=*)\s*(\d*)\s*$/
const REGEX_MULTI_ID = /^\s*(\d+\s*,\s*)*\d+\s*$/

const partialUpdate = () => {
    const ui = SpreadsheetApp.getUi()
    const promptResponse = ui.prompt('シナリオID指定または範囲指定 更新・取得', 'IDまたは範囲を指定ください(ex. 100000 <= 200000),(ex. 30)', ui.ButtonSet.OK)
    if (promptResponse.getSelectedButton() == ui.Button.CLOSE) return
    const rangeOrId = promptResponse.getResponseText()
    if (rangeOrId.match(REGEX_ID)) {
        singleUpdate(parseInt(rangeOrId))
    } else if (REGEX_MULTI_ID.test(rangeOrId)) {
        multipleUpdate(rangeOrId)
    } else if (REGEX_RANGE.test(rangeOrId)) {
        const regexpResult = REGEX_RANGE.exec(rangeOrId) || []
        const start = regexpResult[1] ? parseInt(regexpResult[1]) : 0
        const end = parseInt(regexpResult[3]) ? parseInt(regexpResult[3]) : 99999999
        const sign = regexpResult[2]
        if (start <= end) {
            const currentValues = SHEET.getSheetValues(START_BODY_ROW, 1, SHEET.getLastRow(), Constants.SYNC_LAST_COLUMN)
            const client = new SimpleHttpClient()
            oauth(client)
            let page = 1
            while (true) {
                const scenarios = getScenarios(page)
                if (scenarios.length === 0) return
                scenarios
                    .filter((s: Scenario) => eval(`${start}
                    ${sign}
                    ${s.id} && ${s.id}
                    ${sign}
                    ${end}`))
                    .forEach(s => complementScenarioAndWrite(currentValues, new Scenario(s), client))
                page++
            }
        } else {
            ui.alert('シナリオID指定または範囲指定 更新・取得', '範囲指定が不正です', ui.ButtonSet.OK)
        }
    } else {
        ui.alert('シナリオID指定または範囲指定 更新・取得', '範囲指定が不正です', ui.ButtonSet.OK)
    }
}

const singleUpdate = (id: number) => {
    const scenario = getScenario(id)
    if (scenario === null) {
        console.info(`target scenario id: ${id} is not found`)
        return
    }
    const currentValues = SHEET.getSheetValues(START_BODY_ROW, 1, SHEET.getLastRow(), Constants.SYNC_LAST_COLUMN)
    const client = new SimpleHttpClient()
    oauth(client)
    complementScenarioAndWrite(currentValues, new Scenario(scenario), client, true)
}

const multipleUpdate = (ids: string) => {
    ids.split(',').forEach(id => singleUpdate(parseInt(id)))
}

const complementScenarioAndWrite = (currentValues: any[][], scenario: Scenario, client: SimpleHttpClient, forceUpdate?: boolean) => {
    const scenarioWithExecuteResult = complementScenario(client, scenario);
    const index = currentValues.findIndex(v => v[CompareToIndex.ID] == scenarioWithExecuteResult.id)
    console.info(`target scenario id: ${scenarioWithExecuteResult.id}`)
    if (index < 0)
        writeScenario(client, scenarioWithExecuteResult, SHEET.getLastRow() + 1)
    else if (!scenarioWithExecuteResult.isSame(currentValues[index]) || forceUpdate)
        writeScenario(client, scenarioWithExecuteResult, index + START_BODY_ROW)
}

const complementScenario = (client: SimpleHttpClient, scenario: Scenario) => {
    const {
        lastScenarioExecuteDate,
        lastScenarioExecuteLink,
        lastScenarioExecuteEnvironment
    } = getLastScenarioExecute(client, scenario.id)
    const relationPlanArray = getRelationPlans(client, scenario.id)
    const lastUpdatedBy = getLastUpdatedBy(client, scenario.id)
    const existsDataTable = isExistsDataTable(client, scenario.id)
    return new ScenarioWithExecuteResult(scenario, lastScenarioExecuteDate, lastScenarioExecuteLink, lastScenarioExecuteEnvironment, relationPlanArray, lastUpdatedBy, existsDataTable)
}

const writeScenario = (client: SimpleHttpClient, scenarioWithExecuteResult: ScenarioWithExecuteResult, row: number) => {
    const range = SHEET.getRange(row, 1, 1, Constants.SYNC_LAST_COLUMN)
    console.info(`update scenario id: ${scenarioWithExecuteResult.id}`)
    range.setRichTextValues([scenarioWithExecuteResult.toRichTextValues()])
}

export {updateFromUI, partialUpdate, update, resume}
