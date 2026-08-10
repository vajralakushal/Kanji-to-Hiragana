/**
 * Background service worker.
 *
 * Its only job is to proxy AnkiConnect requests for the popup and content
 * scripts. The worker holds the host permission for http://localhost:8765,
 * so its fetches are exempt from the CORS policy that would block the same
 * request made from a normal web page.
 */

import { getDeckNames, getKnownWords } from "./anki";
import type { BackgroundMessage, BackgroundResponse } from "./types";

chrome.runtime.onMessage.addListener(
  (message: BackgroundMessage, _sender, sendResponse) => {
    // Only handle the Anki proxy messages; popup<->content messages use the
    // same channel and should be ignored here.
    if (message.kind !== "anki:getDecks" && message.kind !== "anki:getKnownWords") {
      return false;
    }

    handleAnkiMessage(message)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error: Error) =>
        sendResponse({ ok: false, error: error.message } satisfies BackgroundResponse<never>)
      );

    // Returning true tells Chrome we will call sendResponse asynchronously.
    return true;
  }
);

/** Dispatch an Anki proxy message to the matching AnkiConnect call. */
function handleAnkiMessage(message: BackgroundMessage): Promise<unknown> {
  switch (message.kind) {
    case "anki:getDecks":
      return getDeckNames();
    case "anki:getKnownWords":
      return getKnownWords(message.deck);
  }
}
