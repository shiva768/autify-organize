import HttpHeaders = GoogleAppsScript.URL_Fetch.HttpHeaders;
import URLFetchRequestOptions = GoogleAppsScript.URL_Fetch.URLFetchRequestOptions;
import {Cheerio} from "cheerio";

const AUTIFY_API_URL = 'https://app.autify.com/api/v1//projects/hoge'
const START_BODY_ROW = 2
const AUTIFY_APP_SCRAPING_BASE_URL = 'https://app.autify.com'
const AUTIFY_AUTH_SCRAPING_BASE_URL = 'https://auth.autify.com'
const AUTIFY_SCRAPING_LOGIN_ID = 'loginId'
const AUTIFY_SCRAPING_LOGIN_PASSWORD = 'password'

class Scenario {
    id: number
    name: string
    project_url: string
    created_at: Date
    updated_at: Date
    labels: Label[]

    constructor(s: Scenario) {
        this.id = s.id
        this.name = s.name
        this.project_url = s.project_url
        this.created_at = new Date(s.created_at)
        this.updated_at = new Date(s.updated_at)
        this.labels = s.labels
    }

    labelNames() {
        return this.labels.map(l => l.name).join(', ')
    }

    isSame(compareTo: Array<any>) {
        return this.name === compareTo[1]
            && this.updated_at.getTime() === new Date(compareTo[3]).getTime()
            && this.labelNames() === compareTo[4]
    }
}

interface Label {
    id: number,
    name: string,
    color: string,
    created_at: string,
    updated_at: string,
}

class SimpleHttpClient {
    cookies: { [key: string]: any } = {}
    handleCookiesArray: string[] = ['auth0', 'auth0_compat', 'did', 'did_compat', '_behivee_session']

    getCookies = (cookies: string[] | string, keys: string[]): { [key: string]: any } => {
        const targetCookies: { [key: string]: any } = {}
        const _cookies = []
        if (typeof cookies === 'string')
            _cookies.push(cookies)
        else
            _cookies.push(...cookies)
        _cookies.forEach(c => {
            c.split(';')
                .forEach((c: string) => {
                    const [key, value] = c.split('=')
                    if (keys.includes(key.trim())) {
                        targetCookies[key] = value
                    }
                })
        })
        return targetCookies
    };

    request(url: string, method: GoogleAppsScript.URL_Fetch.HttpMethod, payload?: GoogleAppsScript.URL_Fetch.Payload, headers?: GoogleAppsScript.URL_Fetch.HttpHeaders): GoogleAppsScript.URL_Fetch.HTTPResponse {
        console.log(`request url: ${url}`)
        console.log(`payload: ${JSON.stringify(payload)}`)
        console.log(`headers: ${JSON.stringify(headers)}`)
        console.log(`cookies: ${JSON.stringify(this.cookies)}`)
        const options: URLFetchRequestOptions = {
            method: method,
            headers: headers,
            payload: payload,
            followRedirects: false,
        }
        if (this.cookies.length > 0) {
            options.headers = options.headers || {}
            options.headers['Cookie'] = Object.keys(this.cookies).map((k: string) => `${k}=${this.cookies[k]}`).join(';')
        }
        const response = UrlFetchApp.fetch(url, options)
        const responseHeaders: { [key: string]: any } = response.getAllHeaders()
        const responseCookies = responseHeaders['Set-Cookie'] || []
        Object.assign(this.cookies, this.getCookies(responseCookies, this.handleCookiesArray))
        return response
    }

    get(url: string, headers?: HttpHeaders): GoogleAppsScript.URL_Fetch.HTTPResponse {
        return this.request(url, 'get', undefined, headers)
    }

    post(url: string, payload?: GoogleAppsScript.URL_Fetch.Payload, headers?: GoogleAppsScript.URL_Fetch.HttpHeaders): GoogleAppsScript.URL_Fetch.HTTPResponse {
        return this.request(url, 'post', payload, headers)
    }

}

const createOptions = () => {
    const bearerKey = PropertiesService.getScriptProperties().getProperty("KEY")
    const headers: HttpHeaders = {
        'Authorization': `Bearer ${bearerKey}`
    }
    const options: URLFetchRequestOptions = {
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

const visitAutify = (client: SimpleHttpClient, url: string) => {
    const response = client.get(url)
    // @ts-ignore
    const $ = Cheerio.load(response.getContentText())
    const token: string = $('meta[name="csrf-token"]').attr('content')
    return token
}

const auth0 = (client: SimpleHttpClient, url: string, token: string) => {
    const response = client.post(url, {'authenticity_token': token})
    const headers: { [key: string]: any } = response.getAllHeaders()
    return headers['Location']
};

const authorize = (client: SimpleHttpClient, url: string): { [key: string]: any } => {
    const response = client.get(url)
    const headers: { [key: string]: any } = response.getAllHeaders()
    return headers['Location']
};

const identifier = (client: SimpleHttpClient, url: string) => {
    client.get(url)
    const response = client.post(url, {
        'username': AUTIFY_SCRAPING_LOGIN_ID
    }, {'Content-Type': 'application/x-www-form-urlencoded'})
    const headers: { [key: string]: any } = response.getAllHeaders()
    return headers['Location']
};

const password = (client: SimpleHttpClient, url: string) => {
    client.get(url)
    const response = client.post(url, {
        'username': AUTIFY_SCRAPING_LOGIN_ID,
        'password': AUTIFY_SCRAPING_LOGIN_PASSWORD
    }, {'Content-Type': 'application/x-www-form-urlencoded'})
    const headers: { [key: string]: any } = response.getAllHeaders()
    return headers['Location']
};

const resume = (client: SimpleHttpClient, url: string) => {
    const response = client.get(url)
    const headers: { [key: string]: any } = response.getAllHeaders()
    return headers['Location']
};

const callback = (client: SimpleHttpClient, url: string) => {
    const response = client.get(url)
    const headers: { [key: string]: any } = response.getAllHeaders()
    return headers['Location']
};

const appAutify = (client: SimpleHttpClient, url: string) => {
    const response = client.get(url)
    const headers: { [key: string]: any } = response.getAllHeaders()
    return headers['Location']
};

const appAutifyProjects = (client: SimpleHttpClient, url: string) => {
    client.get(url)
};

const oauth = () => {
    const client = new SimpleHttpClient()
    const token = visitAutify(client, `${AUTIFY_APP_SCRAPING_BASE_URL}/auth/signin`)
    const authorizeRedirectUrl = auth0(client, `${AUTIFY_APP_SCRAPING_BASE_URL}/auth/auth0`, token)
    const identifierRedirectPath = authorize(client, authorizeRedirectUrl)
    const passwordRedirectPath = identifier(client, `${AUTIFY_AUTH_SCRAPING_BASE_URL}${identifierRedirectPath}`)
    const resumeRedirectPath = password(client, `${AUTIFY_AUTH_SCRAPING_BASE_URL}${passwordRedirectPath}`)
    const callbackRedirectUrl = resume(client, `${AUTIFY_AUTH_SCRAPING_BASE_URL}${resumeRedirectPath}`)
    const appAutifyRedirectUrl = callback(client, callbackRedirectUrl)
    const projectRedirectUrl = appAutify(client, appAutifyRedirectUrl)
    appAutifyProjects(client, projectRedirectUrl)
    console.log(client.cookies)
};

const test = () => {

    const response = oauth()
}

export {update, partialUpdate, oauth}
