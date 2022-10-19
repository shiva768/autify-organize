import {update, partialUpdate, test} from './Code'

declare const global: {
    [x: string]: any;
}

global.update = update

global.partialUpdate = partialUpdate

global.test = test