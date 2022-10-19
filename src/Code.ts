import Scenario from "./Scenario";
import oauth from "./OAuth";
import {Constants} from "./Constants";
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

const writeScenario = (_scenario: Scenario, row: number) => {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('scenarios')
    if (sheet === null) return
    const lastColumn = sheet.getLastColumn() - 3
    const range = sheet.getRange(row, 1, 1, lastColumn)
    const scenario = new Scenario(_scenario)
    console.log(`update scenario id: ${scenario.id}`)
    range.setValues([[`=HYPERLINK("${scenario.project_url}", "${scenario.id}")`, scenario.name, scenario.created_at, scenario.updated_at, scenario.labelNames()]])
}

const update = () => {
    const ui = SpreadsheetApp.getUi()
    const button = ui.alert('シナリオ更新・取得', '実行しますか', ui.ButtonSet.YES_NO)
    if (button !== ui.Button.YES) return
    let page = 1
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('scenarios')
    if (sheet === null) return
    const currentValues = sheet.getSheetValues(START_BODY_ROW, 1, sheet.getLastRow(), sheet.getLastColumn())
    while (true) {
        const scenarios = getScenarios(page)
        if (scenarios.length === 0) return
        scenarios.filter(s => {
            const index = currentValues.findIndex(v => v[0] == s.id)
            if (index < 0)
                writeScenario(s, sheet.getLastRow() + 1)
            else if (!new Scenario(s).isSame(currentValues[index])) {
                writeScenario(s, index + START_BODY_ROW)
            }
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
    const index = currentValues.findIndex(v => v[0] == scenario.id)
    if (index < 0)
        writeScenario(scenario, sheet.getLastRow() + 1)
    else
        writeScenario(scenario, index + START_BODY_ROW)
}

const test = () => {

    oauth()
}

export {update, partialUpdate, test}
