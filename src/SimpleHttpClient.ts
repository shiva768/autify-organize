const HANDLED_COOKIES_ARRAY: string[] = ['auth0', 'auth0_compat', 'did', 'did_compat', '_behivee_session']
export default class SimpleHttpClient {
    private cookies: { [key: string]: any } = {}

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
    };

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
        const response = UrlFetchApp.fetch(url, options)
        const responseHeaders: { [key: string]: any } = response.getAllHeaders()
        const responseCookies = responseHeaders['Set-Cookie'] || []
        Object.assign(this.cookies, this.getCookies(responseCookies, HANDLED_COOKIES_ARRAY))
        return response
    }

    public get(url: string, headers?: GoogleAppsScript.URL_Fetch.HttpHeaders): GoogleAppsScript.URL_Fetch.HTTPResponse {
        return this.request(url, 'get', undefined, headers)
    }

    public post(url: string, payload?: GoogleAppsScript.URL_Fetch.Payload, headers?: GoogleAppsScript.URL_Fetch.HttpHeaders): GoogleAppsScript.URL_Fetch.HTTPResponse {
        return this.request(url, 'post', payload, headers)
    }

    public debugCookies() {
        Logger.log(this.cookies)
    }

}