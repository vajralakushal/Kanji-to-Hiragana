/**
 * Content script: runs in every page and reacts to commands from the popup.
 *
 * It owns the page's annotation state (via annotator.ts) and, when Anki
 * integration is on, asks the background service worker for the list of
 * already-studied words before annotating.
 */

import {
  applyAnnotations,
  revertAnnotations,
  getActiveMode,
} from "./annotator";
import type {
  AnkiSettings,
  BackgroundResponse,
  ContentMessage,
  ContentResponse,
} from "./types";

chrome.runtime.onMessage.addListener(
  (message: ContentMessage, _sender, sendResponse: (r: ContentResponse) => void) => {
    // Ignore background-bound messages that share this channel.
    if (
      message.kind !== "apply" &&
      message.kind !== "revert" &&
      message.kind !== "getState"
    ) {
      return false;
    }

    handleMessage(message)
      .then(sendResponse)
      .catch((error: Error) =>
        sendResponse({
          ok: false,
          activeMode: getActiveMode(),
          error: error.message,
        })
      );

    // Returning true keeps the message port open for the async response.
    return true;
  }
);

/** Execute one popup command and describe the outcome. */
async function handleMessage(message: ContentMessage): Promise<ContentResponse> {
  switch (message.kind) {
    case "getState":
      return { ok: true, activeMode: getActiveMode() };

    case "revert":
      revertAnnotations();
      return { ok: true, activeMode: null };

    case "apply": {
      const { knownWords, warning } = await fetchKnownWords(message.anki);
      await applyAnnotations(message.mode, knownWords);
      return { ok: true, activeMode: getActiveMode(), warning };
    }
  }
}

/**
 * Fetch the user's known words from Anki via the background worker.
 *
 * Failures are deliberately non-fatal: if Anki isn't running we still
 * annotate the page (annotating too much beats doing nothing), but we pass
 * a warning back so the popup can tell the user what happened.
 */
async function fetchKnownWords(
  anki: AnkiSettings
): Promise<{ knownWords: Set<string>; warning?: string }> {
  if (!anki.enabled || !anki.deck) {
    return { knownWords: new Set() };
  }

  const response = (await chrome.runtime.sendMessage({
    kind: "anki:getKnownWords",
    deck: anki.deck,
  })) as BackgroundResponse<string[]>;

  if (!response.ok) {
    return {
      knownWords: new Set(),
      warning: `Annotated without Anki filtering — ${response.error}`,
    };
  }
  return { knownWords: new Set(response.result) };
}
