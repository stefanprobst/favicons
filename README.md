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
