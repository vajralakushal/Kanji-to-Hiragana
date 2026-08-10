/**
 * Lazy, cached wrapper around the kuromoji morphological analyzer.
 *
 * Building the tokenizer means downloading and decompressing ~17 MB of
 * dictionary data, so we do it once per page and reuse the instance for
 * every subsequent annotation request.
 */

import kuromoji, { Tokenizer, IpadicFeatures } from "kuromoji";

let tokenizerPromise: Promise<Tokenizer<IpadicFeatures>> | null = null;

/**
 * Get the shared tokenizer, building it on first use.
 * The dictionary files are bundled with the extension under dict/ and
 * exposed to pages via web_accessible_resources in the manifest.
 */
export function getTokenizer(): Promise<Tokenizer<IpadicFeatures>> {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise((resolve, reject) => {
      kuromoji
        .builder({ dicPath: chrome.runtime.getURL("dict/") })
        .build((err, tokenizer) => {
          if (err) {
            // Allow a retry on the next call instead of caching the failure.
            tokenizerPromise = null;
            reject(err);
          } else {
            resolve(tokenizer);
          }
        });
    });
  }
  return tokenizerPromise;
}

/** True if the character is a CJK ideograph (i.e. a kanji). */
export function isKanji(char: string): boolean {
  return (
    (char >= "一" && char <= "龯") || // CJK Unified Ideographs
    (char >= "㐀" && char <= "䶿") // CJK Extension A
  );
}

/** True if the string contains at least one kanji character. */
export function containsKanji(text: string): boolean {
  return [...text].some(isKanji);
}

/**
 * Convert katakana to hiragana. Kuromoji reports readings in katakana,
 * but furigana is conventionally written in hiragana.
 * The two scripts are exactly 0x60 apart in Unicode.
 */
export function katakanaToHiragana(str: string): string {
  return str.replace(/[ァ-ヶ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}
