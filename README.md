# Generate favicons

## How to use

```sh
create-favicons -i [FILE] -o [FOLDER] [...OPTIONS]
```

Options:

- `-i`, `--input`: path to input file
- `-o`, `--output`: path to output folder
- `-n`, `--name`: name for webmanifest (optional)
- `-s`, `--short`: short name for webmanifest (optional)
- `-c`, `--color`: theme color for webmanifest (optional)
- `-m`, `--maskable`: mark images as maskable (optional)
- `-u`, `--url`: set the start_url path (optional)
- `-h`, `--help`: show help message

If the `--color` option is not provided, the theme color will be set to the
image's dominant color.

Example:

```sh
create-favicons -i src/assets/images/logo.svg -o public
```

The following files are generated:

- `android-chrome-192x192.png` (192x192px)
- `android-chrome-512x512.png` (512x512px)
- `apple-touch-icon.png` (180x180px)
- `favicon-16x16.png` (16x16px)
- `favicon-32x32.png` (32x32px)
- `favicon.ico` (16x16px, 32x32px, 48x48px)

To use the generated favicons, copy them to your site's root folder, and add the
following to the `<head>` element:

```html
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="manifest" href="/site.webmanifest" />
```

Note: `favicon.ico` and the android icons don't need to be referenced explicitly
as long as they live in the root folder (the browser will automatically find
them there).
