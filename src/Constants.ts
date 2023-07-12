export namespace Constants {
    export const AUTIFY_PROJECT_ID = PropertiesService.getScriptProperties().getProperty('AUTIFY_PROJECT_ID')
    export const AUTIFY_API_URL = `https://app.autify.com/api/v1//projects/${AUTIFY_PROJECT_ID}`
    export const AUTIFY_APP_SCRAPING_BASE_URL = 'https://app.autify.com'
    export const AUTIFY_AUTH_SCRAPING_BASE_URL = 'https://auth.autify.com'
    export const AUTIFY_SCRAPING_LOGIN_ID = PropertiesService.getScriptProperties().getProperty('AUTIFY_SCRAPING_LOGIN_ID')
    export const AUTIFY_SCRAPING_LOGIN_PASSWORD = PropertiesService.getScriptProperties().getProperty('AUTIFY_SCRAPING_LOGIN_PASSWORD')
    export const START_BODY_ROW = 2
    export const SYNC_LAST_COLUMN = 12
    export const MAX_RETRY_COUNT = 3
    export const RESUME_TRIGGER_NAME = 'resume'
    export const RESUME_PAGE_KEY = 'resume_page_number'
    export const MAX_EXECUTION_TIME = 20 * 60 * 1000
    export const DELAY_TIME = 10 * 1000
    export namespace CompareToIndex {
        export const ID = 0
        export const NAME = 1
        export const EXISTS_DATA_TABLE = 2
        // export const CREATED_DATE = 3
        export const UPDATED_DATE = 4
        // export const UPDATED_BY = 5
        export const LABELS = 6
        export const PLANS = 7
        export const LAST_SCENARIO_EXECUTE_DATE = 8
        // export const LAST_SCENARIO_EXECUTE_LINK = 9
        // export const LAST_SCENARIO_EXECUTE_ENVIRONMENT = 10
    }
}

