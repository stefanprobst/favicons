import { existsSync, promises as fs, unlinkSync } from 'fs'
import { join } from 'path'
import type { FitEnum } from 'sharp'
import sharp from 'sharp'

import { toIco } from './to-ico.js'

const { stat, writeFile } = fs

export type Options = {
  /**
   * background color used with `fit: "contain"`
   *
   * @default 'transparent'
   */
  background?: string
  /**
   * resize strategy
   *
   * @default 'contain'
   */
  fit?: keyof FitEnum
  /** path to input file */
  inputFilePath: string
  /** path to output folder */
  outputFolder: string
  /** name for webmanifest */
  name?: string | undefined
  /** short_name for webmanifest */
  shortName?: string | undefined
  /** theme color for webmanifest */
  color?: string | undefined
  /** mark images as maskable */
  maskable?: boolean | undefined
  /** set the start_url path */
  startUrl?: string | undefined
  /**
   * File name for webmanifest.
   *
   * @default "site.webmanifest"
   */
  manifestFileName?: string | undefined
}

export type Stats = {
  /** paths and sizes (in bytes) of generated images */
  images: Array<{ fileName: string; size: number }>
  /** path to generated webmanifest */
  manifest: string
}

type WebManifest = {
  name: string
  short_name: string
  icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>
  theme_color: string
  background_color: string
  display: string
  start_url: string
}

type IconFormat = [string, number | Array<number>]

const formats: Array<IconFormat> = [
  ['android-chrome-192x192.png', 192],
  ['android-chrome-512x512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon.ico', [32]],
]
const DEFAULT_WEB_MANIFEST = 'site.webmanifest'

export default async function generate({
  fit = 'contain',
  inputFilePath,
  outputFolder,
  name = '',
  shortName,
  color,
  background = 'transparent',
  maskable,
  startUrl,
  manifestFileName = DEFAULT_WEB_MANIFEST,
}: Options): Promise<Stats> {
  /** ensure output folder exists */
  if (!existsSync(outputFolder)) {
    await fs.mkdir(outputFolder, { recursive: true })
  }

  /** create webmanifest */

  if (typeof color === 'string' && !color.startsWith('#')) {
    color = '#' + color
  }

  const themeColor = color || (await getDominantColor(inputFilePath))

  const webManifest: WebManifest = {
    name,
    short_name: shortName || name,
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    theme_color: themeColor,
    background_color: themeColor,
    display: 'standalone',
    start_url: startUrl || '/',
  }
  if (maskable) {
    webManifest.icons.forEach((icon) => (icon.purpose = 'any maskable'))
  }

  const webManifestFile = join(outputFolder, manifestFileName)

  await writeFile(webManifestFile, JSON.stringify(webManifest), {
    encoding: 'utf-8',
  })

  /** create favicons */

  const inputMetadata = await sharp(inputFilePath).metadata()

  const transformers: Array<Promise<{ size: number }>> = formats.map(([outputFileName, size]) => {
    const outputPath = join(outputFolder, outputFileName)

    /**
     * .ico format needs to be handled separately - sharp support for .ico
     * depends on globally installed libvips compiled with imagemagick support
     */
    if (Array.isArray(size)) {
      return Promise.all(
        size.map((s) => {
          const density = getDensity(s, inputMetadata)
          return sharp(inputFilePath, { density })
            .resize({ width: s, height: s, fit, background })
            .ensureAlpha(0)
            .raw({ depth: 'uchar' })
            .toBuffer({ resolveWithObject: true })
        }),
      )
        .then((buffers) => toIco(buffers))
        .then((buffer) => writeFile(outputPath, buffer))
        .then(() => stat(outputPath))
    }

    const density = getDensity(size, inputMetadata)
    return sharp(inputFilePath, { density })
      .resize({ width: size, height: size, fit, background })
      .toFile(outputPath)
  })

  try {
    const favicons = await Promise.all(transformers)
    const stats: Stats = {
      images: favicons.map(({ size }, i) => {
        const [fileName] = formats[i]
        return { fileName, size }
      }),
      manifest: DEFAULT_WEB_MANIFEST,
    }
    return stats
  } catch (error) {
    cleanup([...formats.map(([fileName]) => fileName), webManifestFile])
    throw error
  }
}

async function getDominantColor(inputFilePath: string) {
  const { dominant } = await sharp(inputFilePath).stats()
  return toHexColor(dominant)
}

function toHexColor(color: { r: number; g: number; b: number }) {
  return (
    '#' +
    Object.values(color)
      .map((c) => c.toString(16))
      .join('')
  )
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
function getDensity(size: number, { format, width, height, density }: sharp.Metadata) {
  if (format !== 'svg' || !width || !height || !density) return undefined
  const value = (size / Math.max(width, height)) * density
  return value
}

function cleanup(fileNames: Array<string>) {
  try {
    fileNames.forEach((fileName) => unlinkSync(fileName))
  } catch (error) {
    // file was not created
  }
}

type SocialImageOptions = {
  /** @default 'transparent' */
  background?: string
  /** @default 'contain' */
  fit?: keyof FitEnum
  /** @default 628 */
  height?: number
  /** @default 1200 */
  width?: number
}

export function generateSocialImage(
  inputFilePath: string,
  outputFilePath: string,
  options: SocialImageOptions = {},
) {
  const { width = 1200, height = 628, fit = 'contain', background = 'transparent' } = options

  return sharp(inputFilePath)
    .resize({ width, height, fit, background })
    .webp()
    .toFile(outputFilePath)
}
