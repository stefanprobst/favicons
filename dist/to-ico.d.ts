/**
 * Copied from https://raw.githubusercontent.com/itgalaxy/favicons/master/src/ico.js
 * which in turn is based on https://github.com/kevva/to-ico/blob/master/index.js
 */
/// <reference types="node" resolution-mode="require"/>
export interface Img {
    info: {
        width: number;
        height: number;
    };
    data: Buffer;
}
export declare function toIco(images: Array<Img>): Buffer;
