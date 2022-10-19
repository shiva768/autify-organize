import SimpleHttpClient from "./SimpleHttpClient";
// @ts-ignore
import {Cheerio, Element, load} from "cheerio";

const SUCCESS = Symbol('success')
const FAILURE = Symbol('failure')
const ERROR = Symbol('error')
const CANCEL = Symbol('cancel')
const UNKNOWN = Symbol('unknown')
type RESULT = typeof SUCCESS | typeof FAILURE | typeof ERROR | typeof CANCEL | typeof UNKNOWN

const judgeResult = (resultCard: Cheerio<Element>): RESULT => {
    if (resultCard.hasClass('result-card-success')) {
        return SUCCESS
    } else if (resultCard.hasClass('result-card-failure')) {
        return FAILURE
    } else {
        const resultCardIcon = resultCard.find('div.result-card-status.px-2 > svg')
        if (resultCardIcon.hasClass('fa-ban')) {
            return ERROR
        } else if (resultCardIcon.hasClass('fa-minus-circle')) {
            return CANCEL
        } else {
            return UNKNOWN
        }
    }
};

const lastScenarioExecute = (client: SimpleHttpClient, scenarioId: number):{ lastScenarioExecuteDate: string; lastScenarioExecuteResult: RESULT; lastScenarioExecuteEnvironment: string } => {
    const responseText = client.get(`https://app.autify.com/projects/hoge/scenarios/${scenarioId}/results`).getContentText()
    const $ = load(responseText)
    const resultCard = $('body > div > div > main > section:nth-child(3) > div:nth-child(1)')
    const lastScenarioExecuteResult = judgeResult(resultCard);
    const lastScenarioExecuteEnvironment = resultCard.find('.result-card-content > .result-card-link').text().replace(/[\n\t]*\s{2}\n*/g, '')
    const datetimeStampString = resultCard.find('.result-card-metadata-value').attr('data-timestamp')
    const lastScenarioExecuteDate = datetimeStampString ? new Date(parseInt(datetimeStampString) * 1000).toLocaleDateString('ja-JP') : '-'
    return {lastScenarioExecuteDate, lastScenarioExecuteResult, lastScenarioExecuteEnvironment}
};

const relationPlans = (client: SimpleHttpClient, scenarioId: number): { text: string, href: string | undefined }[] => {
    const responseText = client.get(`https://app.autify.com/projects/hoge/scenarios/${scenarioId}/test_plans`).getContentText()
    const $ = load(responseText)
    const planElements: Cheerio<Element> = $('body > div > div > main > section:nth-child(3) > div > a')
    console.log(planElements.text())
    return planElements.toArray().map((_: number, e: Cheerio<Element>) => {
        console.log(e.attr('href'))
        console.log(e.text())
        return {text: $(e).text(), href: $(e).attr('href')}
    })
};

export {lastScenarioExecute, relationPlans, RESULT}