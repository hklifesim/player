# HK Life Sim Player

This is a local static copy of the Flutter Web build from:

https://pub-4512ec7b1b0042c0b6f5f5396027ae5c.r2.dev/hklifesim/index.html

## Run Locally

```bash
npm start
```

Then open:

```text
http://localhost:4173
```

## Verify Files

```bash
npm run check
```

## Runtime Language Files

The app can load localized event and era data without rebuilding Flutter.

```text
assets/assets/events.en.json
assets/assets/era_config.en.json
assets/assets/events.zh-Hans.json
assets/assets/era_config.zh-Hans.json
```

Preview a language with:

```text
http://localhost:4173/?lang=en
```

Supported language aliases are `zh-Hant`, `zh-Hans`, and `en`. If a localized file does not exist, the app falls back to the original Traditional Chinese JSON file.

## Deploy

Deploy this directory as a static site. No build step is required. The entry file is `index.html`, and the required Flutter runtime files, assets, icons, and CanvasKit files are already included.

For most static hosts, use:

```bash
npm run check
```

before uploading the directory.
