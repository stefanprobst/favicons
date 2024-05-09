import { existsSync, promises as fs, unlinkSync } from "fs";
import { join } from "path";
import sharp from "sharp";
import { toIco } from "./to-ico.js";
const { stat, writeFile } = fs;
const formats = [
    ["android-chrome-192x192.png", 192],
    ["android-chrome-512x512.png", 512],
    ["apple-touch-icon.png", 180],
    ["favicon.ico", [32]],
];
const DEFAULT_WEB_MANIFEST = "site.webmanifest";
export default async function generate({ fit = "contain", inputFilePath, outputFolder, name = "", shortName, color, background = "transparent", maskable, startUrl, manifestFileName = DEFAULT_WEB_MANIFEST, }) {
    /** ensure output folder exists */
    if (!existsSync(outputFolder)) {
        await fs.mkdir(outputFolder, { recursive: true });
    }
    /** create webmanifest */
    const themeColor = color || (await getDominantColor(inputFilePath));
    const webManifest = {
        name,
        short_name: shortName || name,
        icons: [
            {
                src: "/android-chrome-192x192.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/android-chrome-512x512.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],
        theme_color: themeColor,
        background_color: themeColor,
        display: "standalone",
        start_url: startUrl || "/",
    };
    if (maskable) {
        webManifest.icons.forEach((icon) => {
            return (icon.purpose = "any maskable");
        });
    }
    const webManifestFile = join(outputFolder, manifestFileName);
    await writeFile(webManifestFile, JSON.stringify(webManifest), {
        encoding: "utf-8",
    });
    /** create favicons */
    const inputMetadata = await sharp(inputFilePath).metadata();
    const transformers = formats.map(([outputFileName, size]) => {
        const outputPath = join(outputFolder, outputFileName);
        /**
         * .ico format needs to be handled separately - sharp support for .ico
         * depends on globally installed libvips compiled with imagemagick support
         */
        if (Array.isArray(size)) {
            return Promise.all(size.map((s) => {
                const density = getDensity(s, inputMetadata);
                return sharp(inputFilePath, { density })
                    .resize({ width: s, height: s, fit, background })
                    .ensureAlpha(0)
                    .raw({ depth: "uchar" })
                    .toBuffer({ resolveWithObject: true });
            }))
                .then((buffers) => {
                return toIco(buffers);
            })
                .then((buffer) => {
                return writeFile(outputPath, buffer);
            })
                .then(() => {
                return stat(outputPath);
            });
        }
        const density = getDensity(size, inputMetadata);
        return sharp(inputFilePath, { density })
            .resize({ width: size, height: size, fit, background })
            .toFile(outputPath);
    });
    try {
        const favicons = await Promise.all(transformers);
        const stats = {
            images: favicons.map(({ size }, i) => {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const [fileName] = formats[i];
                return { fileName, size };
            }),
            manifest: DEFAULT_WEB_MANIFEST,
        };
        return stats;
    }
    catch (error) {
        cleanup([
            ...formats.map(([fileName]) => {
                return fileName;
            }),
            webManifestFile,
        ]);
        throw error;
    }
}
async function getDominantColor(inputFilePath) {
    const { dominant } = await sharp(inputFilePath).stats();
    return toHexColor(dominant);
}
function toHexColor(color) {
    return ("#" +
        Object.values(color)
            .map((c) => {
            return c.toString(16);
        })
            .join(""));
}
/**
 * increase dpi to avoid blurry images when converting svg to png with librsvg.
 * sharp defaults to 72dpi, and respects the `width` and `height` attributes on
 * the svg element (and falls back to viewBox for size when no `width` or `height`
 * attributes are present).
 *
 * for a different approach
 * @see https://github.com/itgalaxy/favicons/blob/master/src/helpers.js#L42-L97
 */
function getDensity(size, { format, width, height, density }) {
    if (format !== "svg" || !width || !height || !density)
        return undefined;
    const value = (size / Math.max(width, height)) * density;
    return value;
}
function cleanup(fileNames) {
    try {
        fileNames.forEach((fileName) => {
            return unlinkSync(fileName);
        });
    }
    catch (error) {
        // file was not created
    }
}
export function generateSocialImage(inputFilePath, outputFilePath, options = {}) {
    const { width = 1200, height = 630, fit = "contain", background = "transparent" } = options;
    return sharp(inputFilePath)
        .resize({ width, height, fit, background })
        .png()
        .toFile(outputFilePath);
}
