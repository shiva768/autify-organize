import SimpleHttpClient from "./SimpleHttpClient";
import {Constants} from "./Constants";
import {Cheerio} from "cheerio";
import AUTIFY_SCRAPING_LOGIN_ID = Constants.AUTIFY_SCRAPING_LOGIN_ID;
import AUTIFY_SCRAPING_LOGIN_PASSWORD = Constants.AUTIFY_SCRAPING_LOGIN_PASSWORD;
import AUTIFY_APP_SCRAPING_BASE_URL = Constants.AUTIFY_APP_SCRAPING_BASE_URL;
import AUTIFY_AUTH_SCRAPING_BASE_URL = Constants.AUTIFY_AUTH_SCRAPING_BASE_URL;

const getLocation = (response: GoogleAppsScript.URL_Fetch.HTTPResponse) => {
    const headers: { [key: string]: any } = response.getAllHeaders()
    return headers['Location']
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
    return getLocation(response)
}
const authorize = (client: SimpleHttpClient, url: string): { [key: string]: any } => {
    const response = client.get(url)
    return getLocation(response)
}
const identifier = (client: SimpleHttpClient, url: string) => {
    client.get(url)
    const response = client.post(url, {
        'username': AUTIFY_SCRAPING_LOGIN_ID
    }, {'Content-Type': 'application/x-www-form-urlencoded'})
    return getLocation(response)
}
const password = (client: SimpleHttpClient, url: string) => {
    client.get(url)
    const response = client.post(url, {
        'username': AUTIFY_SCRAPING_LOGIN_ID,
        'password': AUTIFY_SCRAPING_LOGIN_PASSWORD
    }, {'Content-Type': 'application/x-www-form-urlencoded'})
    return getLocation(response)
}
const resume = (client: SimpleHttpClient, url: string) => {
    const response = client.get(url)
    return getLocation(response)
}
const callback = (client: SimpleHttpClient, url: string) => {
    const response = client.get(url)
    return getLocation(response)
}
const appAutify = (client: SimpleHttpClient, url: string) => {
    const response = client.get(url)
    return getLocation(response)
}
const appAutifyProjects = (client: SimpleHttpClient, url: string) => {
    client.get(url)
}
function oauth() {
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
}
export default oauth