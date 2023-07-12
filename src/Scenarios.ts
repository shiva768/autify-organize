import Label from "./Label"
import {SCENARIO_LINK} from "./ScenarioScraping"
import {Constants} from "./Constants"
import AUTIFY_APP_SCRAPING_BASE_URL = Constants.AUTIFY_APP_SCRAPING_BASE_URL;
import CompareToIndex = Constants.CompareToIndex;

class Scenario {
    readonly id: number
    protected readonly name: string
    protected readonly project_url: string
    protected readonly created_at: Date
    protected readonly updated_at: Date
    protected readonly labels: Label[]

    public constructor(s: Scenario) {
        this.id = s.id
        this.name = s.name
        this.project_url = s.project_url
        this.created_at = new Date(s.created_at)
        this.updated_at = new Date(s.updated_at)
        this.labels = s.labels
    }

    protected labelNames() {
        return this.labels.map(l => l.name).join(', ')
    }

    protected convertToLocalString(date: Date | undefined) {
        if (Number.isNaN(date?.getTime())) return '-'
        return date?.toLocaleString('ja-JP') || '-'
    }

    protected isSame(compareTo: Array<any>) {
        // console.log(`name: "${this.name}" === "${compareTo[CompareToIndex.NAME]}"\n
        // updated_at: "${this.convertToLocalString(this.updated_at)}" === "${this.convertToLocalString(new Date(compareTo[CompareToIndex.UPDATED_DATE]))}"\n
        // labels: "${this.labelNames()}" === "${compareTo[CompareToIndex.LABELS]}"`)
        return this.name === compareTo[CompareToIndex.NAME]
            && this.convertToLocalString(this.updated_at) === this.convertToLocalString(new Date(compareTo[CompareToIndex.UPDATED_DATE]))
            && this.labelNames() === compareTo[CompareToIndex.LABELS]
    }
}

class ScenarioWithExecuteResult extends Scenario {
    private readonly lastScenarioExecuteDate: Date | undefined
    private readonly lastScenarioExecuteResult: SCENARIO_LINK
    private readonly lastScenarioExecuteEnvironment: string
    private readonly relationPlanArray: RelationPlan[]
    private readonly lastUpdatedBy: string
    private readonly existsDataTable: boolean

    public constructor(scenario: Scenario, lastScenarioExecuteDate: Date | undefined, lastScenarioExecuteResult: SCENARIO_LINK, lastScenarioExecuteEnvironment: string, relationPlanArray: RelationPlan[], lastUpdatedBy: string, existsDataTable: boolean) {
        super(scenario)
        this.lastScenarioExecuteDate = lastScenarioExecuteDate
        this.lastScenarioExecuteResult = lastScenarioExecuteResult
        this.lastScenarioExecuteEnvironment = lastScenarioExecuteEnvironment
        this.relationPlanArray = relationPlanArray
        this.lastUpdatedBy = lastUpdatedBy
        this.existsDataTable = existsDataTable
    }

    public isSame(compareTo: Array<any>) {
        // console.log(`plan: "${this.getRelationPlanString()}" === "${compareTo[CompareToIndex.PLANS]}"\n
        // execute date: "${this.convertToLocalString(this.lastScenarioExecuteDate)}" === "${this.convertToLocalString(new Date(compareTo[CompareToIndex.LAST_SCENARIO_EXECUTE_DATE]))}"`)
        return super.isSame(compareTo)
            && this.getRelationPlanString() === compareTo[CompareToIndex.PLANS]
            && this.convertToLocalString(this.lastScenarioExecuteDate) === this.convertToLocalString(new Date(compareTo[CompareToIndex.LAST_SCENARIO_EXECUTE_DATE]))
    }

    public toRichTextValues(): GoogleAppsScript.Spreadsheet.RichTextValue[] {
        const relationPlanBuilder = SpreadsheetApp.newRichTextValue().setText(this.relationPlanArray.map(p => p.text).join(','))
        // @ts-ignore
        this.relationPlanArray.filter(p => p.text.length > 0).reduce((prev: string, current: { text: string, href: string }) => {
            relationPlanBuilder.setLinkUrl(prev.length, prev.length + current.text.length, `${AUTIFY_APP_SCRAPING_BASE_URL}${current.href}`)
            return prev + current.text + ','
        }, '')
        return [
            this.createSimpleRichTextValue(this.id, this.project_url),
            this.createSimpleRichTextValue(this.name),
            this.createSimpleRichTextValue(this.existsDataTable ? '○' : ''),
            this.createSimpleRichTextValue(this.convertToLocalString(this.created_at)),
            this.createSimpleRichTextValue(this.convertToLocalString(this.updated_at)),
            this.createSimpleRichTextValue(this.lastUpdatedBy),
            this.createSimpleRichTextValue(this.labelNames()),
            relationPlanBuilder.build(),
            this.createSimpleRichTextValue(this.convertToLocalString(this.lastScenarioExecuteDate)),
            this.createSimpleRichTextValue(this.lastScenarioExecuteResult.result, this.lastScenarioExecuteResult.href),
            this.createSimpleRichTextValue(this.lastScenarioExecuteEnvironment),
            this.createSimpleRichTextValue(this.convertToLocalString(new Date())),
        ]
    }

    private getRelationPlanString() {
        return this.relationPlanArray.map(r => r.text).join(',')
    }

    private createSimpleRichTextValue(text: any, link?: string): GoogleAppsScript.Spreadsheet.RichTextValue {
        const builder = SpreadsheetApp.newRichTextValue().setText(text)
        if (link !== undefined)
            builder.setLinkUrl(link)
        return builder.build()
    }
}

export {Scenario, ScenarioWithExecuteResult}