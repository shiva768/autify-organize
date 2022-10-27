export namespace Constants {
    export const AUTIFY_PROJECT_ID = PropertiesService.getScriptProperties().getProperty('AUTIFY_PROJECT_ID')
    export const AUTIFY_API_URL = `https://app.autify.com/api/v1//projects/${AUTIFY_PROJECT_ID}`
    export const AUTIFY_APP_SCRAPING_BASE_URL = 'https://app.autify.com'
    export const AUTIFY_AUTH_SCRAPING_BASE_URL = 'https://auth.autify.com'
    export const AUTIFY_SCRAPING_LOGIN_ID = PropertiesService.getScriptProperties().getProperty('AUTIFY_SCRAPING_LOGIN_ID')
    export const AUTIFY_SCRAPING_LOGIN_PASSWORD = PropertiesService.getScriptProperties().getProperty('AUTIFY_SCRAPING_LOGIN_PASSWORD')
    export const START_BODY_ROW = 2
    export const SYNC_LAST_COLUMN = 10
    export namespace CompareToIndex {
        // export const ID = 0
        export const NAME = 1
        // export const CREATED_DATE = 2
        export const UPDATED_DATE = 3
        // export const UPDATED_BY = 4
        export const LABELS = 5
        export const PLANS = 6
        export const LAST_SCENARIO_EXECUTE_DATE = 7
        // export const LAST_SCENARIO_EXECUTE_LINK = 8
        // export const LAST_SCENARIO_EXECUTE_ENVIRONMENT = 9
    }
}

