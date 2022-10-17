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

const getCookies = (cookies: string[] | string, keys: string[]): { [key: string]: any } => {
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

const visitAutify = (url: string) => {
    const response = UrlFetchApp.fetch(url)
    const headers: { [key: string]: any } = response.getAllHeaders()
    const visitCookies = getCookies(headers['Set-Cookie'], ['_behivee_session'])
    // @ts-ignore
    const $ = Cheerio.load(response.getContentText())
    const token: string = $('meta[name="csrf-token"]').attr('content')
    return {token, visitCookies}
}

const auth0 = (url: string, token: string, cookies: { [p: string]: any }) => {
    const response = UrlFetchApp.fetch(url, {
        'method': 'post',
        'payload': {
            'authenticity_token': token,
        },
        'followRedirects': false,
        'headers': {
            'Cookie': Object.keys(cookies).map((k: string) => `${k}=${cookies[k]}`).join(';')
        }
    })
    const headers: { [key: string]: any } = response.getAllHeaders()
    const autifyAuth0Cookies = getCookies(headers['Set-Cookie'], ['_behivee_session'])
    const authorizeRedirectUrl = headers['Location']
    return {authorizeRedirectUrl, autifyAuth0Cookies}
};

const authorize = (url: string): { [key: string]: any } => {
    const response = UrlFetchApp.fetch(url, {'followRedirects': false})
    const headers: { [key: string]: any } = response.getAllHeaders()
    const authorizeCookies = getCookies(headers['Set-Cookie'], ['auth0', 'auth0_compat', 'did', 'did_compat'])
    const identifierRedirectPath = headers['Location']
    return {identifierRedirectPath, authorizeCookies}
};

const identifier = (url: string, cookies: { [p: string]: any }) => {
    UrlFetchApp.fetch(url, {'headers': {'Cookie': Object.keys(cookies).map((k: string) => `${k}=${cookies[k]}`).join(';')}})
    const response = UrlFetchApp.fetch(url, {
        'method': 'post',
        'followRedirects': false,
        'payload': {
            'username': AUTIFY_SCRAPING_LOGIN_ID
        },
        'headers': {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': Object.keys(cookies).map((k: string) => `${k}=${cookies[k]}`).join(';')
        }
    })
    const headers: { [key: string]: any } = response.getAllHeaders()
    return headers['Location']
};

const password = (url: string, cookies: { [p: string]: any }) => {
    UrlFetchApp.fetch(url, {'headers': {'Cookie': Object.keys(cookies).map((k: string) => `${k}=${cookies[k]}`).join(';')}})
    const response = UrlFetchApp.fetch(url, {
        'method': 'post',
        'payload': {
            'username': AUTIFY_SCRAPING_LOGIN_ID,
            'password': AUTIFY_SCRAPING_LOGIN_PASSWORD,
        },
        'followRedirects': false,
        'headers': {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': Object.keys(cookies).map((k: string) => `${k}=${cookies[k]}`).join(';')
        }
    })
    const headers: { [key: string]: any } = response.getAllHeaders()
    return headers['Location']
};

const createGetHeadersObject = (cookies: { [p: string]: any }) => ({
    'headers': {
        'Cookie': Object.keys(cookies).map((k: string) => `${k}=${cookies[k]}`).join(';')
    },
    'followRedirects': false
});

const resume = (url: string, cookies: { [p: string]: any }) => {
    const response = UrlFetchApp.fetch(url, createGetHeadersObject(cookies))
    const headers: { [key: string]: any } = response.getAllHeaders()
    return headers['Location']
};

const callback = (url: string, cookies: { [p: string]: any }) => {
    const response = UrlFetchApp.fetch(url, createGetHeadersObject(cookies))
    const headers: { [key: string]: any } = response.getAllHeaders()
    const autifyCallbackCookies = getCookies(headers['Set-Cookie'], ['_behivee_session'])
    const appAutifyRedirectUrl = headers['Location']
    return {appAutifyRedirectUrl, autifyCallbackCookies}
};

const appAutify = (url: string, cookies: { [p: string]: any }) => {
    const response = UrlFetchApp.fetch(url, createGetHeadersObject(cookies))
    const headers: { [key: string]: any } = response.getAllHeaders()
    const projectCookies = getCookies(headers['Set-Cookie'], ['_behivee_session'])
    const projectRedirectUrl = headers['Location']
    return {projectRedirectUrl, projectCookies}
};

const appAutifyProjects = (url: string, cookies: { [p: string]: any }) => {
    const response = UrlFetchApp.fetch(url, createGetHeadersObject(cookies))
    const headers: { [key: string]: any } = response.getAllHeaders()
    return getCookies(headers['Set-Cookie'], ['_behivee_session'])
};

const oauth = () => {
    const {token, visitCookies} = visitAutify(`${AUTIFY_APP_SCRAPING_BASE_URL}/auth/signin`)
    const {
        authorizeRedirectUrl,
        autifyAuth0Cookies
    } = auth0(`${AUTIFY_APP_SCRAPING_BASE_URL}/auth/auth0`, token, visitCookies)
    const {identifierRedirectPath, authorizeCookies} = authorize(authorizeRedirectUrl)
    const passwordRedirectPath = identifier(`${AUTIFY_AUTH_SCRAPING_BASE_URL}${identifierRedirectPath}`, authorizeCookies)
    const resumeRedirectPath = password(`${AUTIFY_AUTH_SCRAPING_BASE_URL}${passwordRedirectPath}`, authorizeCookies)
    const callbackRedirectUrl = resume(`${AUTIFY_AUTH_SCRAPING_BASE_URL}${resumeRedirectPath}`, authorizeCookies)
    const {appAutifyRedirectUrl, autifyCallbackCookies} = callback(callbackRedirectUrl, autifyAuth0Cookies)
    const {projectRedirectUrl, projectCookies} = appAutify(appAutifyRedirectUrl, autifyCallbackCookies)
    const sessionCookies = appAutifyProjects(projectRedirectUrl, projectCookies);
    console.log(sessionCookies)
};

const test = () => {
    oauth()
}

export {update, partialUpdate, oauth, test}
