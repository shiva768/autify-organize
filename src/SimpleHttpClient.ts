import URLFetchRequestOptions = GoogleAppsScript.URL_Fetch.URLFetchRequestOptions;
import HttpHeaders = GoogleAppsScript.URL_Fetch.HttpHeaders;

export default class SimpleHttpClient {
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
        const options: URLFetchRequestOptions = {
            method: method,
            headers: headers,
            payload: payload,
            followRedirects: false,
        }
        if (Object.keys(this.cookies).length > 0) {
            options.headers = options.headers || {}
            options.headers['Cookie'] = Object.keys(this.cookies).map(key => `${key}=${this.cookies[key]}`).join('; ')
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