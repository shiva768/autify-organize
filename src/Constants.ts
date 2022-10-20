export namespace Constants {
    export const AUTIFY_PROJECT_ID = PropertiesService.getScriptProperties().getProperty('AUTIFY_PROJECT_ID')
    export const AUTIFY_API_URL = `https://app.autify.com/api/v1//projects/${AUTIFY_PROJECT_ID}`
    export const START_BODY_ROW = 2
    export const AUTIFY_APP_SCRAPING_BASE_URL = 'https://app.autify.com'
    export const AUTIFY_AUTH_SCRAPING_BASE_URL = 'https://auth.autify.com'
    export const AUTIFY_SCRAPING_LOGIN_ID = PropertiesService.getScriptProperties().getProperty('AUTIFY_SCRAPING_LOGIN_ID')
    export const AUTIFY_SCRAPING_LOGIN_PASSWORD = PropertiesService.getScriptProperties().getProperty('AUTIFY_SCRAPING_LOGIN_PASSWORD')
}