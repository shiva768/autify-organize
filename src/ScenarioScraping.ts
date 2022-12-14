import SimpleHttpClient from "./SimpleHttpClient"
// @ts-ignore
import {Cheerio, Element, load} from "cheerio"
import {Constants} from "./Constants"
import AUTIFY_PROJECT_ID = Constants.AUTIFY_PROJECT_ID

enum RESULT {
    SUCCESS = 'success',
    FAILURE = 'failure',
    DOING = 'doing',
    ERROR = 'error',
    CANCEL = 'cancel',
    UNKNOWN = 'unknown',
    NOT_YET_EXECUTED = '-'
}

interface SCENARIO_LINK {
    result: RESULT
    href: string | undefined
}

const judgeResult = (resultCard: Cheerio<Element>): RESULT => {
    if (resultCard.length <= 0) return RESULT.NOT_YET_EXECUTED
    if (resultCard.hasClass('result-card-success')) {
        return RESULT.SUCCESS
    } else if (resultCard.hasClass('result-card-danger')) {
        return RESULT.FAILURE
    } else {
        const resultCardIcon = resultCard.find('div.result-card-status.px-2 > i')
        if (resultCardIcon.hasClass('fa-ban')) return RESULT.ERROR
        else if (resultCardIcon.hasClass('fa-minus-circle')) return RESULT.CANCEL
        else if (resultCardIcon.hasClass('fa-spinner')) return RESULT.DOING
        return RESULT.UNKNOWN
    }
}

const getLastScenarioExecute = (client: SimpleHttpClient, scenarioId: number): { lastScenarioExecuteDate: Date | undefined; lastScenarioExecuteLink: SCENARIO_LINK; lastScenarioExecuteEnvironment: any } => {
    const responseText = client.get(`https://app.autify.com/projects/${AUTIFY_PROJECT_ID}/scenarios/${scenarioId}/results`).getContentText()
    const $ = load(responseText)
    const resultCard = $('body > div > div > main > section:nth-child(3) > div:nth-child(1)')
    const lastScenarioExecuteResult = judgeResult(resultCard)
    const resultCardLink: Element = resultCard.find('.result-card-content > .result-card-link')
    const lastScenarioExecuteEnvironment = resultCardLink.text().replace(/[\n\t]*\s{2}\n*/g, '') || '-'
    const lastScenarioExecuteLink = {result: lastScenarioExecuteResult, href: resultCardLink.attr('href')}
    const datetimeStampString = resultCard.find('.result-card-metadata-value').attr('data-timestamp')
    const datetimeStamp = parseInt(datetimeStampString)
    const lastScenarioExecuteDate = datetimeStampString && 0 < datetimeStamp ? new Date(datetimeStamp * 1000) : undefined
    return {lastScenarioExecuteDate, lastScenarioExecuteLink, lastScenarioExecuteEnvironment}
}

const getRelationPlans = (client: SimpleHttpClient, scenarioId: number): RelationPlan[] => {
    const responseText = client.get(`https://app.autify.com/projects/${AUTIFY_PROJECT_ID}/scenarios/${scenarioId}/test_plans`).getContentText()
    const $ = load(responseText)
    const planElements: Cheerio<Element> = $('body > div > div > main > section:nth-child(3) > div > a')
    return planElements.toArray().map((e: Element) => {
        const cheerioElement = $(e)
        return {text: cheerioElement.text(), href: cheerioElement.attr('href')} as RelationPlan
    })
}

const getLastUpdatedBy = (client: SimpleHttpClient, scenarioId: number): string => {
    const responseText = client.get(`https://app.autify.com/projects/${AUTIFY_PROJECT_ID}/scenarios/${scenarioId}/histories`).getContentText()
    const $ = load(responseText)
    const lastUpdatedByElement: Cheerio<Element> = $('body > div.dashboard > div > main > section:nth-child(3) > div:nth-child(1) > a > span:nth-child(3) > span')
    return lastUpdatedByElement?.text() || '-'
}

const isExistsDataTable = (client: SimpleHttpClient, scenarioId: number): boolean => {
    const responseText = client.get(`https://app.autify.com/projects/${AUTIFY_PROJECT_ID}/scenarios/${scenarioId}`).getContentText()
    const $ = load(responseText)
    return !$('body > div.d-none').next().text().includes('dataTable: []')
}

export {getLastScenarioExecute, getRelationPlans, getLastUpdatedBy, isExistsDataTable, SCENARIO_LINK}