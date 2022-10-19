import Scenario from "./Scenario";
import oauth from "./OAuth";
import {Constants} from "./Constants";
import SimpleHttpClient from "./SimpleHttpClient";
import {lastScenarioExecute, relationPlans, RESULT} from "./ScenarioScraping";
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
    writeScenario(currentValues, new Scenario(scenario), client, sheet)
}

const writingScenario = (client: SimpleHttpClient, _scenario: Scenario, relationPlanArray:{ text: string, href: string | undefined }[], lastScenarioExecuteDate:string, lastScenarioExecuteResult:RESULT, lastScenarioExecuteEnvironment:string, row: number) => {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('scenarios')
    if (sheet === null) return
    const range = sheet.getRange(row, 1, 1, sheet.getLastColumn())
    const scenario = new Scenario(_scenario)
    const richTextBuilder = SpreadsheetApp.newRichTextValue().setText(relationPlanArray.map(p => p.text).join(','))
    console.log(relationPlanArray)
    // @ts-ignore
    relationPlanArray.filter(p => p.text.length > 0).reduce((prev: string, current:{ text: string, href: string }) => {
        richTextBuilder.setLinkUrl(prev.length, current.text.length + 1, current.href)
        return prev + current.text + ','
    }, '')
    console.log(`update scenario id: ${scenario.id}`)
    range.setValues([[`=HYPERLINK("${scenario.project_url}", "${scenario.id}")`, scenario.name, scenario.created_at, scenario.updated_at, scenario.labelNames(), '', lastScenarioExecuteDate, lastScenarioExecuteResult.description, lastScenarioExecuteEnvironment]])
    sheet.getRange(row, 6, 1, 1).setRichTextValue(richTextBuilder.build())
}

const writeScenario = (currentValues: any[][], scenario: Scenario, client: SimpleHttpClient, sheet: GoogleAppsScript.Spreadsheet.Sheet) => {
    const {
        lastScenarioExecuteDate,
        lastScenarioExecuteResult,
        lastScenarioExecuteEnvironment
    } = lastScenarioExecute(client, scenario.id)
    const relationPlanArray = relationPlans(client, scenario.id)
    console.log(relationPlanArray)
    const relationPlanString = relationPlanArray.map(p => p.text).join(',')
    const index = currentValues.findIndex(v => v[0] == scenario.id)
    if (index < 0)
        writingScenario(client, scenario, relationPlanArray, lastScenarioExecuteDate, lastScenarioExecuteResult, lastScenarioExecuteEnvironment,sheet.getLastRow() + 1)
    else if (!scenario.isSame(currentValues[index])
        || relationPlanString !== currentValues[index][5]
        || lastScenarioExecuteDate !== currentValues[index][6]
        || lastScenarioExecuteResult !== currentValues[index][7]
        || lastScenarioExecuteEnvironment !== currentValues[index][8]) {
        writingScenario(client, scenario, relationPlanArray, lastScenarioExecuteDate, lastScenarioExecuteResult, lastScenarioExecuteEnvironment, index + START_BODY_ROW)
    }
};

export {update, partialUpdate}
