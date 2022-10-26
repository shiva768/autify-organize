import {Scenario, ScenarioWithExecuteResult} from "./Scenarios";
import oauth from "./OAuth";
import {Constants} from "./Constants";
import SimpleHttpClient from "./SimpleHttpClient";
import {lastScenarioExecute, relationPlans} from "./ScenarioScraping";
import AUTIFY_API_URL = Constants.AUTIFY_API_URL;
import START_BODY_ROW = Constants.START_BODY_ROW;

const SHEET = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('scenarios') || SpreadsheetApp.getActiveSpreadsheet().insertSheet('scenarios')

const createOptions = () => {
    const bearerKey = PropertiesService.getScriptProperties().getProperty("KEY")
    const headers: GoogleAppsScript.URL_Fetch.HttpHeaders = {
        'Authorization': `Bearer ${bearerKey}`
    }
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        'method': 'get',
        'headers': headers
    }
    return options
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
    const responseText = UrlFetchApp.fetch(`${AUTIFY_API_URL}/scenarios/${id}`, options).getContentText()
    return JSON.parse(responseText) as Scenario
}

const update = () => {
    const ui = SpreadsheetApp.getUi()
    const button = ui.alert('シナリオ 更新・取得', '実行しますか', ui.ButtonSet.YES_NO)
    if (button !== ui.Button.YES) return
    const currentValues = SHEET.getSheetValues(START_BODY_ROW, 1, SHEET.getLastRow(), Constants.SYNC_LAST_COLUMN)
    const client = new SimpleHttpClient()
    oauth(client)
    let page = 1
    while (true) {
        const scenarios = getScenarios(page)
        if (scenarios.length === 0) return
        scenarios.forEach(s => writeScenario(currentValues, new Scenario(s), client))
        page++
    }
}

const REGEX_ID = /^\d+$/
const REGEX_RANGE = /^\s*(\d*)\s*(<=*)\s*(\d*)\s*$/

const partialUpdate = () => {
    const ui = SpreadsheetApp.getUi()
    const promptResponse = ui.prompt('シナリオID指定または範囲指定 更新・取得', 'IDまたは範囲を指定ください(ex. 100000 <= 200000),(ex. 30)', ui.ButtonSet.OK)
    if (promptResponse.getSelectedButton() == ui.Button.CLOSE) return
    const rangeOrId = promptResponse.getResponseText()
    if (rangeOrId.match(REGEX_ID)) {
        singleUpdate(parseInt(rangeOrId))
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
                    .filter((s: Scenario) => eval(`${start} ${sign} ${s.id} && ${s.id} ${sign} ${end}`))
                    .forEach(s => writeScenario(currentValues, new Scenario(s), client))
                page++
            }
        }else{
            ui.alert('シナリオID指定または範囲指定 更新・取得', '範囲指定が不正です', ui.ButtonSet.OK)
        }
    }else{
        ui.alert('シナリオID指定または範囲指定 更新・取得', '範囲指定が不正です', ui.ButtonSet.OK)
    }
}

const singleUpdate = (id: number) => {
    const scenario = getScenario(id)
    const currentValues = SHEET.getSheetValues(START_BODY_ROW, 1, SHEET.getLastRow(), Constants.SYNC_LAST_COLUMN)
    const client = new SimpleHttpClient()
    oauth(client)
    writeScenario(currentValues, new Scenario(scenario), client, true)
}

const writeScenario = (currentValues: any[][], scenario: Scenario, client: SimpleHttpClient, forceUpdate?: boolean) => {
    const {
        lastScenarioExecuteDate,
        lastScenarioExecuteLink,
        lastScenarioExecuteEnvironment
    } = lastScenarioExecute(client, scenario.id)
    const relationPlanArray = relationPlans(client, scenario.id)
    const scenarioWithExecuteResult = new ScenarioWithExecuteResult(scenario, lastScenarioExecuteDate, lastScenarioExecuteLink, lastScenarioExecuteEnvironment, relationPlanArray)
    const index = currentValues.findIndex(v => v[0] == scenarioWithExecuteResult.id)
    console.info(`target scenario id: ${scenarioWithExecuteResult.id}`)
    if (index < 0)
        writingScenario(client, scenarioWithExecuteResult, SHEET.getLastRow() + 1)
    else if (!scenarioWithExecuteResult.isSame(currentValues[index]) || forceUpdate)
        writingScenario(client, scenarioWithExecuteResult, index + START_BODY_ROW)
};

const writingScenario = (client: SimpleHttpClient, scenarioWithExecuteResult: ScenarioWithExecuteResult, row: number) => {
    const range = SHEET.getRange(row, 1, 1, Constants.SYNC_LAST_COLUMN)
    console.info(`update scenario id: ${scenarioWithExecuteResult.id}`)
    range.setRichTextValues([scenarioWithExecuteResult.toRichTextValues()])
}

export {update, partialUpdate}
