import {partialUpdate, updateOuter, update} from './Code'

declare const global: {
    [x: string]: any
}

global.updateOuter = updateOuter
global.update = update
global.partialUpdate = partialUpdate
global.forceUpdate = () => updateOuter(true)
