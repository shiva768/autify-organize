import Scenario from "./Scenario";
import oauth from "./OAuth";
import {Constants} from "./Constants";
import SimpleHttpClient from "./SimpleHttpClient";
import {lastScenarioExecute, relationPlans, SCENARIO_LINK} from "./ScenarioScraping";
import AUTIFY_API_URL = Constants.AUTIFY_API_URL;
import START_BODY_ROW = Constants.START_BODY_ROW;
import AUTIFY_APP_SCRAPING_BASE_URL = Constants.AUTIFY_APP_SCRAPING_BASE_URL;

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

const writeScenario = (currentValues: any[][], scenario: Scenario, client: SimpleHttpClient, sheet: GoogleAppsScript.Spreadsheet.Sheet) => {
    const {
        lastScenarioExecuteDate,
        lastScenarioExecuteLink,
        lastScenarioExecuteEnvironment
    } = lastScenarioExecute(client, scenario.id)
    const relationPlanArray = relationPlans(client, scenario.id)
    const relationPlanString = relationPlanArray.map(p => p.text).join(',')
    const index = currentValues.findIndex(v => v[0] == scenario.id)
    const currentExecutedDateValue = currentValues[index][6] === '-' ? '-' : (currentValues[index][6] as Date).toLocaleString('ja-JP')
    if (index < 0)
        writingScenario(client, scenario, relationPlanArray, lastScenarioExecuteDate, lastScenarioExecuteLink, lastScenarioExecuteEnvironment, sheet.getLastRow() + 1)
    else if (!scenario.isSame(currentValues[index])
        || relationPlanString !== currentValues[index][5]
        || lastScenarioExecuteDate !== currentExecutedDateValue) {
        writingScenario(client, scenario, relationPlanArray, lastScenarioExecuteDate, lastScenarioExecuteLink, lastScenarioExecuteEnvironment, index + START_BODY_ROW)
    }
};

const writingScenario = (client: SimpleHttpClient, _scenario: Scenario, relationPlanArray: { text: string, href: string | undefined }[], lastScenarioExecuteDate: string, lastScenarioExecuteResult: SCENARIO_LINK, lastScenarioExecuteEnvironment: string, row: number) => {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('scenarios')
    if (sheet === null) return
    const range = sheet.getRange(row, 1, 1, sheet.getLastColumn())
    const scenario = new Scenario(_scenario)
    console.log(`update scenario id: ${scenario.id}`)
    range.setValues([[`=HYPERLINK("${scenario.project_url}", "${scenario.id}")`, scenario.name, scenario.created_at, scenario.updated_at, scenario.labelNames(), '', lastScenarioExecuteDate, '', lastScenarioExecuteEnvironment]])
    const relationPlanBuilder = SpreadsheetApp.newRichTextValue().setText(relationPlanArray.map(p => p.text).join(','))
    // @ts-ignore
    relationPlanArray.filter(p => p.text.length > 0).reduce((prev: string, current: { text: string, href: string }) => {
        relationPlanBuilder.setLinkUrl(prev.length, prev.length + current.text.length, `${AUTIFY_APP_SCRAPING_BASE_URL}${current.href}`)
        return prev + current.text + ','
    }, '')
    sheet.getRange(row, 6, 1, 1).setRichTextValue(relationPlanBuilder.build())
    const resultBuilder = SpreadsheetApp.newRichTextValue().setText(lastScenarioExecuteResult.result)
    if (lastScenarioExecuteResult.href !== undefined)
        resultBuilder.setLinkUrl(0, lastScenarioExecuteResult.result.length, lastScenarioExecuteResult.href).build()
    sheet.getRange(row, 8, 1, 1).setRichTextValue(resultBuilder.build())
}

export {update, partialUpdate}
