import {partialUpdate, updateFromUI, update, resume} from './Code'

declare const global: {
    [x: string]: any
}

global.updateFromUI = updateFromUI
global.update = update
global.partialUpdate = partialUpdate
global.forceUpdate = () => updateFromUI(true)
global.resume = () => resume()
