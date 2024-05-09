import type { FitEnum } from "sharp";
import sharp from "sharp";
export type Options = {
    /**
     * background color used with `fit: "contain"`
     *
     * @default 'transparent'
     */
    background?: string;
    /**
     * resize strategy
     *
     * @default 'contain'
     */
    fit?: keyof FitEnum;
    /** path to input file */
    inputFilePath: string;
    /** path to output folder */
    outputFolder: string;
    /** name for webmanifest */
    name?: string | undefined;
    /** short_name for webmanifest */
    shortName?: string | undefined;
    /** theme color for webmanifest */
    color?: string | undefined;
    /** mark images as maskable */
    maskable?: boolean | undefined;
    /** set the start_url path */
    startUrl?: string | undefined;
    /**
     * File name for webmanifest.
     *
     * @default "site.webmanifest"
     */
    manifestFileName?: string | undefined;
};
export type Stats = {
    /** paths and sizes (in bytes) of generated images */
    images: Array<{
        fileName: string;
        size: number;
    }>;
    /** path to generated webmanifest */
    manifest: string;
};
export default function generate({ fit, inputFilePath, outputFolder, name, shortName, color, background, maskable, startUrl, manifestFileName, }: Options): Promise<Stats>;
type SocialImageOptions = {
    /** @default 'transparent' */
    background?: string;
    /** @default 'contain' */
    fit?: keyof FitEnum;
    /** @default 630 */
    height?: number;
    /** @default 1200 */
    width?: number;
};
export declare function generateSocialImage(inputFilePath: string, outputFilePath: string, options?: SocialImageOptions): Promise<sharp.OutputInfo>;
export {};
