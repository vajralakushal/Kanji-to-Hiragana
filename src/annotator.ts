/**
 * The DOM side of the extension: walking the page, annotating kanji words
 * with furigana or replacing them with hiragana, and cleanly undoing it all.
 *
 * Every annotated word is wrapped in a marker element that remembers the
 * original text, so reverting swaps each wrapper back for a plain text node
 * instead of blowing away document.body.innerHTML (which would destroy the
 * page's event listeners and break dynamic sites).
 */

import type { IpadicFeatures } from "kuromoji";
import type { AnnotationMode } from "./types";
import {
  getTokenizer,
  containsKanji,
  katakanaToHiragana,
} from "./tokenizer";

/** Attribute marking elements this extension inserted. */
const WRAPPER_ATTR = "data-kth-wrapper";
/** Class carrying the black underline that marks annotated words. */
const ANNOTATED_CLASS = "kth-annotated";
/** id of the <style> element we inject once per page. */
const STYLE_ID = "kth-style";

/** One replaced text node: the wrapper we inserted and the text it replaced. */
interface Replacement {
  wrapper: HTMLElement;
  originalText: string;
}

/** All replacements made on this page, in insertion order. */
let replacements: Replacement[] = [];

/** Mode currently applied to the page, or null when the page is pristine. */
let activeMode: AnnotationMode | null = null;

export function getActiveMode(): AnnotationMode | null {
  return activeMode;
}

/**
 * Annotate the whole page in the given mode.
 *
 * @param mode        "furigana" adds ruby readings above kanji words;
 *                    "hiragana" replaces kanji words with their reading.
 * @param knownWords  Words to leave untouched (already studied in Anki).
 *                    Pass an empty set to annotate everything.
 */
export async function applyAnnotations(
  mode: AnnotationMode,
  knownWords: ReadonlySet<string>
): Promise<void> {
  // Switching modes (or re-applying) starts from a clean page so the two
  // modes never stack on top of each other.
  if (activeMode !== null) {
    revertAnnotations();
  }

  const tokenizer = await getTokenizer();
  injectUnderlineStyle();

  // Snapshot the text nodes up front: we replace nodes while iterating, and
  // a live TreeWalker would get confused by the mutations.
  const textNodes = collectTextNodes(document.body);

  let processed = 0;
  for (const node of textNodes) {
    annotateTextNode(node, mode, tokenizer.tokenize.bind(tokenizer), knownWords);

    // Yield to the browser every so often so huge pages don't freeze the tab.
    if (++processed % 50 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  activeMode = mode;
}

/** Restore every annotated word to its original text. */
export function revertAnnotations(): void {
  for (const { wrapper, originalText } of replacements) {
    // The wrapper may already be gone if the page re-rendered around us.
    if (wrapper.isConnected && wrapper.parentNode) {
      wrapper.parentNode.replaceChild(
        document.createTextNode(originalText),
        wrapper
      );
    }
  }
  replacements = [];
  activeMode = null;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** Tags whose text must never be tokenized or rewritten. */
const SKIPPED_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEXTAREA",
  "INPUT",
  "RUBY", // already has furigana — leave it alone
  "RT",
  "RP",
]);

/** Depth-first collection of text nodes that contain at least one kanji. */
function collectTextNodes(root: Node): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      // Skip forbidden tags and anything we inserted ourselves, including
      // all of their descendants.
      if (parent.closest(`[${WRAPPER_ATTR}], ${[...SKIPPED_TAGS].join(", ")}`)) {
        return NodeFilter.FILTER_REJECT;
      }
      return containsKanji(node.nodeValue ?? "")
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    },
  });

  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }
  return nodes;
}

type TokenizeFn = (text: string) => IpadicFeatures[];

/**
 * Replace one text node with a wrapper span in which every unknown kanji
 * word is annotated. Words the tokenizer can't identify, words without
 * kanji, and words the user already knows pass through as plain text.
 */
function annotateTextNode(
  node: Text,
  mode: AnnotationMode,
  tokenize: TokenizeFn,
  knownWords: ReadonlySet<string>
): void {
  const originalText = node.nodeValue ?? "";
  const tokens = tokenize(originalText);

  const wrapper = document.createElement("span");
  wrapper.setAttribute(WRAPPER_ATTR, "");

  let anyAnnotated = false;
  for (const token of tokens) {
    const surface = token.surface_form;

    if (shouldAnnotate(token, knownWords)) {
      const reading = katakanaToHiragana(token.reading!);
      wrapper.appendChild(
        mode === "furigana"
          ? buildFuriganaElement(surface, reading)
          : buildHiraganaElement(surface, reading)
      );
      anyAnnotated = true;
    } else {
      wrapper.appendChild(document.createTextNode(surface));
    }
  }

  // If every word was known (or unparseable) leave the node untouched —
  // fewer DOM changes means less chance of upsetting the page.
  if (!anyAnnotated) {
    return;
  }

  node.parentNode?.replaceChild(wrapper, node);
  replacements.push({ wrapper, originalText });
}

/** Decide whether a single token gets annotated. */
function shouldAnnotate(
  token: IpadicFeatures,
  knownWords: ReadonlySet<string>
): boolean {
  // Only dictionary words have a reliable reading; also skip pure-kana words.
  if (token.word_type !== "KNOWN" || !token.reading) return false;
  if (!containsKanji(token.surface_form)) return false;

  // Skip words the user has already studied. We check both the surface form
  // (食べた) and the dictionary form (食べる) because Anki cards almost
  // always store the dictionary form.
  return !(
    knownWords.has(token.surface_form) || knownWords.has(token.basic_form)
  );
}

/**
 * Build `<ruby>word<rt>reading</rt></ruby>` — the standard HTML element for
 * furigana. The underline class marks it as extension-annotated.
 */
function buildFuriganaElement(surface: string, reading: string): HTMLElement {
  const ruby = document.createElement("ruby");
  ruby.className = ANNOTATED_CLASS;
  ruby.appendChild(document.createTextNode(surface));
  const rt = document.createElement("rt");
  rt.textContent = reading;
  ruby.appendChild(rt);
  return ruby;
}

/**
 * Build a span showing the hiragana reading in place of the kanji word.
 * Clicking the span toggles it between the reading and the original kanji,
 * handy for checking yourself.
 */
function buildHiraganaElement(surface: string, reading: string): HTMLElement {
  const span = document.createElement("span");
  span.className = ANNOTATED_CLASS;
  span.textContent = reading;
  span.title = surface; // hover shows the original kanji
  span.dataset.kthOther = surface;
  span.style.cursor = "pointer";
  span.addEventListener("click", () => {
    // Swap the visible text with the stored alternative on every click.
    const shown = span.textContent ?? "";
    span.textContent = span.dataset.kthOther ?? "";
    span.dataset.kthOther = shown;
    span.title = shown;
  });
  return span;
}

/**
 * Inject the black underline style once. Using a real border (not
 * text-decoration) keeps the line visible under <ruby> elements too.
 */
function injectUnderlineStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${ANNOTATED_CLASS} {
      border-bottom: 1px solid #000;
    }
  `;
  document.head.appendChild(style);
}
