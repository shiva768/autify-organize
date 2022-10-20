import {Scenario, ScenarioWithExecuteResult} from "./Scenarios";
import oauth from "./OAuth";
import {Constants} from "./Constants";
import SimpleHttpClient from "./SimpleHttpClient";
import {lastScenarioExecute, relationPlans} from "./ScenarioScraping";
import AUTIFY_API_URL = Constants.AUTIFY_API_URL;
import START_BODY_ROW = Constants.START_BODY_ROW;

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
    const button = ui.alert('シナリオ更新・取得', '実行しますか', ui.ButtonSet.YES_NO)
    if (button !== ui.Button.YES) return
    let page = 1
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('scenarios')
    if (sheet === null) return
    const currentValues = sheet.getSheetValues(START_BODY_ROW, 1, sheet.getLastRow(), sheet.getLastColumn())
    const client = new SimpleHttpClient()
    oauth(client)
    while (true) {
        const scenarios = getScenarios(page)
        if (scenarios.length === 0) return
        scenarios.forEach(s => {
            writeScenario(currentValues, new Scenario(s), client, sheet)
        })
        page++
    }
}

const partialUpdate = () => {
    const ui = SpreadsheetApp.getUi()
    const promptResponse = ui.prompt('シナリオID指定更新・取得', 'シナリオIDを入力してください', ui.ButtonSet.OK)
    if (promptResponse.getSelectedButton() == ui.Button.CLOSE) return
    const id = promptResponse.getResponseText()
    const scenario = getScenario(parseInt(id))
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('scenarios')
    if (sheet === null) return
    const currentValues = sheet.getSheetValues(START_BODY_ROW, 1, sheet.getLastRow(), sheet.getLastColumn())
    const client = new SimpleHttpClient()
    oauth(client)
    writeScenario(currentValues, new Scenario(scenario), client, sheet, true)
}

const writeScenario = (currentValues: any[][], scenario: Scenario, client: SimpleHttpClient, sheet: GoogleAppsScript.Spreadsheet.Sheet, forceUpdate?:boolean) => {
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
        writingScenario(client, scenarioWithExecuteResult, sheet.getLastRow() + 1)
    else if (!scenarioWithExecuteResult.isSame(currentValues[index]) || forceUpdate)
        writingScenario(client, scenarioWithExecuteResult, index + START_BODY_ROW)
};

const writingScenario = (client: SimpleHttpClient, scenarioWithExecuteResult: ScenarioWithExecuteResult, row: number) => {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('scenarios')
    if (sheet === null) return
    const range = sheet.getRange(row, 1, 1, sheet.getLastColumn())
    console.info(`update scenario id: ${scenarioWithExecuteResult.id}`)
    range.setRichTextValues([scenarioWithExecuteResult.toRichTextValues()])
}

export {update, partialUpdate}
