/**
 * Shared message and settings types used by the popup, content script, and
 * background service worker. Keeping every message shape in one file means
 * the compiler checks that senders and receivers agree with each other.
 */

/** The two ways the extension can annotate a page. */
export type AnnotationMode = "furigana" | "hiragana";

/** Anki-related settings chosen in the popup and persisted to chrome.storage. */
export interface AnkiSettings {
  /** When true, words already studied in Anki are left untouched. */
  enabled: boolean;
  /** Name of the Anki deck to check words against. */
  deck: string;
}

// ---------------------------------------------------------------------------
// Popup -> content script messages
// ---------------------------------------------------------------------------

/** Ask the content script to annotate the page in the given mode. */
export interface ApplyMessage {
  kind: "apply";
  mode: AnnotationMode;
  anki: AnkiSettings;
}

/** Ask the content script to restore the page to its original text. */
export interface RevertMessage {
  kind: "revert";
}

/** Ask the content script which mode (if any) is currently active. */
export interface GetStateMessage {
  kind: "getState";
}

export type ContentMessage = ApplyMessage | RevertMessage | GetStateMessage;

/** Response sent back to the popup after any content-script message. */
export interface ContentResponse {
  ok: boolean;
  /** Mode currently applied to the page, or null if the page is untouched. */
  activeMode: AnnotationMode | null;
  /** Non-fatal problem worth surfacing to the user (e.g. Anki unreachable). */
  warning?: string;
  /** Fatal problem; `ok` will be false. */
  error?: string;
}

// ---------------------------------------------------------------------------
// Popup / content script -> background service worker messages
// ---------------------------------------------------------------------------
// All AnkiConnect traffic goes through the background service worker because
// it holds the host permission for http://localhost:8765 — page contexts
// would be blocked by AnkiConnect's CORS policy.

/** Ask the background worker for the user's Anki deck names. */
export interface GetDecksMessage {
  kind: "anki:getDecks";
}

/** Ask the background worker for every already-studied word in a deck. */
export interface GetKnownWordsMessage {
  kind: "anki:getKnownWords";
  deck: string;
}

export type BackgroundMessage = GetDecksMessage | GetKnownWordsMessage;

/** Uniform response wrapper for background requests. */
export type BackgroundResponse<T> =
  | { ok: true; result: T }
  | { ok: false; error: string };
