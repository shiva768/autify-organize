import {Constants} from "./Constants"

const HANDLED_COOKIES_ARRAY: string[] = ['auth0', 'auth0_compat', 'did', 'did_compat', '_behivee_session']
export default class SimpleHttpClient {
    private cookies: { [key: string]: any } = {}
    private retryCount: number = 0

    public get(url: string, headers?: GoogleAppsScript.URL_Fetch.HttpHeaders): GoogleAppsScript.URL_Fetch.HTTPResponse {
        return this.request(url, 'get', undefined, headers)
    }

    public post(url: string, payload?: GoogleAppsScript.URL_Fetch.Payload, headers?: GoogleAppsScript.URL_Fetch.HttpHeaders): GoogleAppsScript.URL_Fetch.HTTPResponse {
        return this.request(url, 'post', payload, headers)
    }

    public debugCookies() {
        Logger.log(this.cookies)
    }

    private getCookies = (cookies: string[] | string, keys: string[]): { [key: string]: any } => {
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
    }

    private request(url: string, method: GoogleAppsScript.URL_Fetch.HttpMethod, payload?: GoogleAppsScript.URL_Fetch.Payload, headers?: GoogleAppsScript.URL_Fetch.HttpHeaders): GoogleAppsScript.URL_Fetch.HTTPResponse {
        const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
            method: method,
            headers: headers,
            payload: payload,
            followRedirects: false,
        }
        if (Object.keys(this.cookies).length > 0) {
            options.headers = options.headers || {}
            options.headers['Cookie'] = Object.keys(this.cookies).map(key => `${key}=${this.cookies[key]}`).join('; ')
        }
        this.retryCount = 0
        const response = this.request_(url, options)
        const responseHeaders: { [key: string]: any } = response.getAllHeaders()
        const responseCookies = responseHeaders['Set-Cookie'] || []
        Object.assign(this.cookies, this.getCookies(responseCookies, HANDLED_COOKIES_ARRAY))
        return response

    }

    private request_(url: string, options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions): GoogleAppsScript.URL_Fetch.HTTPResponse {
        let response
        try{
            response = UrlFetchApp.fetch(url, options)
        }catch (e) {
            console.error(e)
            if(this.retryCount < Constants.MAX_RETRY_COUNT){
                this.retryCount++
                return this.request_(url, options)
            }else{
                throw new Error(`Request failed with code ${e}`)
            }
        }
        if(response.getResponseCode() >= 400){
            if(this.retryCount < Constants.MAX_RETRY_COUNT){
                this.retryCount++
                return this.request_(url, options)
            }else{
                throw new Error(`Request failed with code ${response.getResponseCode()}`)
            }
        }
        return response
    }
}