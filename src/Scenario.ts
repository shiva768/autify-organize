import Label from "./Label";

export default class Scenario {
    id: number
    name: string
    project_url: string
    created_at: Date
    updated_at: Date
    labels: Label[]

    constructor(s: Scenario) {
        this.id = s.id
        this.name = s.name
        this.project_url = s.project_url
        this.created_at = new Date(s.created_at)
        this.updated_at = new Date(s.updated_at)
        this.labels = s.labels
    }

    labelNames() {
        return this.labels.map(l => l.name).join(', ')
    }

    isSame(compareTo: Array<any>) {
        return this.name === compareTo[1]
            && this.updated_at.getTime() === new Date(compareTo[3]).getTime()
            && this.labelNames() === compareTo[4]
    }
}