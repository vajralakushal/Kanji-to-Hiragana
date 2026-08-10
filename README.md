# Kanji-to-Hiragana

A little Chrome extension to allow people to read Japanese words, even if they don't know their Kanji.

Check out more on usage [here](https://vajralakushal.github.io/posts/kanji-to-hiragana/kanji-to-hiragana/).

## Features

- **Add Furigana** — annotates every kanji word on the page with its reading using `<ruby>` elements.
- **Convert Kanji to Hiragana** — replaces kanji words with their hiragana reading. Click any converted word to flip it back and forth between the reading and the original kanji.
- **Anki integration** — with Anki running and the [AnkiConnect](https://foosoft.net/projects/anki-connect/) add-on installed, pick a deck and the extension will leave alone any word you've already studied at least once (matched against the first field of each note, by surface form or dictionary form).
- Every annotated word gets a thin black underline so you can see what was changed.

## Building

```sh
npm install
npm run build      # production build into dist/
npm run watch      # rebuild on change during development
npm run typecheck  # type-check without emitting
```

## Installing

1. Run `npm run build`.
2. Open `chrome://extensions`, enable **Developer mode**.
3. Click **Load unpacked** and select the `dist/` folder.

## Project layout

```
src/
  content.ts    content script: receives popup commands, orchestrates annotation
  annotator.ts  DOM walking, furigana/hiragana rendering, clean revert
  tokenizer.ts  kuromoji setup + kana/kanji helpers
  popup.ts      popup UI logic
  background.ts service worker: proxies AnkiConnect requests
  anki.ts       AnkiConnect client (deck names, known-word fetching)
  types.ts      shared message/settings types
dict/           kuromoji dictionary data (bundled with the extension)
```

AnkiConnect requests are routed through the background service worker because
it holds the `http://localhost:8765` host permission — requests made directly
from a web page would be rejected by AnkiConnect's CORS policy.
