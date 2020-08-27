#!/usr/bin/env node

const {
  existsSync,
  mkdirSync,
  promises: { stat, writeFile },
  unlinkSync,
} = require('fs')
const { join } = require('path')
const parseArgs = require('mri')
const sharp = require('sharp')
const toIco = require('to-ico')

const formats = [
  ['android-chrome-192x192.png', 192],
  ['android-chrome-512x512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon-16x16.png', 16],
  ['favicon-32x32.png', 32],
  ['favicon.ico', [16, 32, 48]],
]
const WEB_MANIFEST = 'site.webmanifest'

module.exports = generate

async function generate({
  inputFilePath,
  outputFolder,
  name = '',
  shortName = '',
  color,
}) {
  /** create webmanifest */

  if (typeof color === 'string' && !color.startsWith('#')) {
    color = '#' + color
  }

  const themeColor = color || (await getDominantColor(inputFilePath))

  const webManifest = {
    name,
    short_name: shortName,
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
    background_color: '#ffffff',
    display: 'standalone',
    start_url: '/',
  }

  const webManifestFile = join(outputFolder, WEB_MANIFEST)

  await writeFile(webManifestFile, JSON.stringify(webManifest), {
    encoding: 'utf-8',
  })

  /** create favicons */

  const inputMetadata = await sharp(inputFilePath).metadata()

  const transformers = formats.map(([outputFileName, size]) => {
    const outputPath = join(outputFolder, outputFileName)

    /**
     * .ico format needs to be handled separately - sharp support for .ico
     * depends on globally installed libvips compiled with imagemagick support
     */
    if (Array.isArray(size)) {
      return Promise.all(
        size.map((s) => {
          const density = getDensity(s, inputMetadata)
          return sharp(inputFilePath, { density }).resize(s, s).toBuffer()
        }),
      )
        .then((buffers) => toIco(buffers))
        .then((buffer) => writeFile(outputPath, buffer))
        .then(() => stat(outputPath))
    }

    const density = getDensity(size, inputMetadata)
    return sharp(inputFilePath, { density })
      .resize(size, size)
      .toFile(outputPath)
  })

  try {
    const favicons = await Promise.all(transformers)
    const stats = {
      images: favicons.map(({ size }, i) => {
        const [fileName] = formats[i]
        return { fileName, size }
      }),
      manifest: WEB_MANIFEST,
    }
    return stats
  } catch (error) {
    cleanup([...formats.map(([fileName]) => fileName), webManifestFile])
    throw error
  }
}

const log = {
  success(message) {
    console.log('✅', message)
  },
  error(message) {
    console.error('⛔', message)
  },
}

async function getDominantColor(inputFilePath) {
  const { dominant } = await sharp(inputFilePath).stats()
  return toHexColor(dominant)
}

function toHexColor(color) {
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
function getDensity(size, { format, width, height, density }) {
  if (format !== 'svg' || !width || !height || !density) return undefined
  const value = (size / Math.max(width, height)) * density
  /**
   * sharp currently only allows a max dpi of 2400.
   * @see https://github.com/lovell/sharp/pull/2348
   */
  return Math.min(value, 2400)
}

function cleanup(fileNames) {
  try {
    fileNames.forEach((fileName) => unlinkSync(fileName))
  } catch (error) {
    // file was not created
  }
}

function formatFileSize(size) {
  if (size < 1024) {
    return `${size} bytes`
  }
  return `${(size / 1024).toFixed(0)} kB`
}

function getOptions() {
  const args = parseArgs(process.argv.slice(2))
  return {
    input: args.i || args.input,
    output: args.o || args.output,
    name: args.n || args.name,
    shortName: args.s || args.short,
    color: args.c || args.color,
  }
}

async function run() {
  const { input, output, name, shortName, color } = getOptions()

  if (
    !input ||
    !output ||
    typeof input !== 'string' ||
    typeof output !== 'string'
  ) {
    console.log(
      [
        'Usage: create-favicons -i [FILE] -o [FOLDER] [...OPTIONS]\n',
        'Options:\n',
        '  -i, --input\tpath to input file',
        '  -o, --output\tpath to output folder',
        '  -n, --name\tname for webmanifest (optional)',
        '  -s, --short\tshort name for webmanifest (optional)',
        '  -c, --color\ttheme color for webmanifest (optional)\n',
      ].join('\n'),
    )
    return Promise.resolve()
  }

  const inputFilePath = join(process.cwd(), input)
  const outputFolder = join(process.cwd(), output)

  if (!existsSync(inputFilePath)) {
    log.error('Input file not found.')
    return Promise.resolve()
  }

  if (!existsSync(outputFolder)) {
    try {
      mkdirSync(outputFolder)
    } catch (error) {
      log.error('Unable to create output folder.')
      return Promise.resolve()
    }
  }

  try {
    const stats = await generate({
      inputFilePath,
      outputFolder,
      name,
      shortName,
      color,
    })

    log.success(
      [
        'Successfully generated favicons!',
        ...stats.images.map(
          ({ fileName, size }) => `${fileName}: ${formatFileSize(size)}`,
        ),
      ].join('\n'),
    )
  } catch (error) {
    log.error(error)
    return Promise.resolve()
  }
}

run().catch(log.error)
