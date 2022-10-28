import {partialUpdate, update} from './Code'

declare const global: {
    [x: string]: any
}

global.update = update
global.partialUpdate = partialUpdate
global.forceUpdate = () => update(true)
