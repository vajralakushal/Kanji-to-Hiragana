/**
 * Popup script: the small control panel behind the toolbar icon.
 *
 * Two toggle buttons (furigana / hiragana) drive the content script of the
 * active tab, and the Anki controls choose whether and against which deck
 * already-studied words are filtered out. On open, the popup asks the tab
 * for its current state so the button labels always reflect reality even
 * after the popup has been closed and reopened.
 */

import type {
  AnkiSettings,
  AnnotationMode,
  BackgroundResponse,
  ContentMessage,
  ContentResponse,
} from "./types";

// ---------------------------------------------------------------------------
// DOM references (popup.html is static, so these always exist)
// ---------------------------------------------------------------------------
const furiganaButton = document.getElementById("furiganaButton") as HTMLButtonElement;
const hiraganaButton = document.getElementById("hiraganaButton") as HTMLButtonElement;
const ankiCheckbox = document.getElementById("ankiIntegration") as HTMLInputElement;
const deckSelect = document.getElementById("ankiDeck") as HTMLSelectElement;
const statusLine = document.getElementById("status") as HTMLDivElement;

/** Mode currently active on the page, mirrored from the content script. */
let activeMode: AnnotationMode | null = null;

document.addEventListener("DOMContentLoaded", () => {
  void restoreSettings();
  void syncStateFromTab();

  furiganaButton.addEventListener("click", () => void toggleMode("furigana"));
  hiraganaButton.addEventListener("click", () => void toggleMode("hiragana"));

  ankiCheckbox.addEventListener("change", () => {
    deckSelect.hidden = !ankiCheckbox.checked;
    if (ankiCheckbox.checked) void loadDecks();
    void chrome.storage.sync.set({ ankiEnabled: ankiCheckbox.checked });
  });

  deckSelect.addEventListener("change", () => {
    void chrome.storage.sync.set({ selectedDeck: deckSelect.value });
  });
});

// ---------------------------------------------------------------------------
// Settings persistence
// ---------------------------------------------------------------------------

/** Load the saved Anki settings into the controls. */
async function restoreSettings(): Promise<void> {
  const stored = await chrome.storage.sync.get(["ankiEnabled", "selectedDeck"]);
  ankiCheckbox.checked = Boolean(stored.ankiEnabled);
  deckSelect.hidden = !ankiCheckbox.checked;
  if (ankiCheckbox.checked) {
    await loadDecks(String(stored.selectedDeck ?? ""));
  }
}

/** Current Anki settings as chosen in the popup right now. */
function currentAnkiSettings(): AnkiSettings {
  return { enabled: ankiCheckbox.checked, deck: deckSelect.value };
}

// ---------------------------------------------------------------------------
// Talking to the active tab
// ---------------------------------------------------------------------------

/** Find the tab this popup is controlling. */
async function getActiveTabId(): Promise<number> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) {
    throw new Error("No active tab found.");
  }
  return tab.id;
}

/** Send a message to the content script, translating Chrome errors. */
async function sendToTab(message: ContentMessage): Promise<ContentResponse> {
  const tabId = await getActiveTabId();
  try {
    return (await chrome.tabs.sendMessage(tabId, message)) as ContentResponse;
  } catch {
    // Happens on pages where content scripts can't run (chrome://, the
    // Web Store, PDFs) or before the script has loaded.
    throw new Error("Can't run on this page. Try reloading the tab first.");
  }
}

/** Ask the page which mode is active so the buttons start out correct. */
async function syncStateFromTab(): Promise<void> {
  try {
    const state = await sendToTab({ kind: "getState" });
    activeMode = state.activeMode;
  } catch {
    // Not an error worth showing at popup-open time; buttons keep defaults.
    activeMode = null;
  }
  updateButtons();
}

/**
 * Apply or revert a mode. Clicking the button for the active mode reverts
 * the page; clicking the other button switches modes (the content script
 * reverts internally before re-annotating).
 */
async function toggleMode(mode: AnnotationMode): Promise<void> {
  const message: ContentMessage =
    activeMode === mode
      ? { kind: "revert" }
      : { kind: "apply", mode, anki: currentAnkiSettings() };

  setBusy(true, activeMode === mode ? "Reverting…" : "Annotating…");
  try {
    const response = await sendToTab(message);
    activeMode = response.activeMode;
    showStatus(response.warning ?? "", Boolean(response.warning));
  } catch (error) {
    showStatus((error as Error).message, true);
  } finally {
    setBusy(false);
    updateButtons();
  }
}

// ---------------------------------------------------------------------------
// Anki deck list
// ---------------------------------------------------------------------------

/** Populate the deck dropdown from AnkiConnect via the background worker. */
async function loadDecks(preselect?: string): Promise<void> {
  const previous = preselect ?? deckSelect.value;
  const response = (await chrome.runtime.sendMessage({
    kind: "anki:getDecks",
  })) as BackgroundResponse<string[]>;

  if (!response.ok) {
    showStatus(response.error, true);
    return;
  }

  deckSelect.replaceChildren(new Option("Select Anki Deck", ""));
  for (const deck of response.result) {
    deckSelect.appendChild(new Option(deck, deck));
  }
  // Keep the user's previous choice if that deck still exists.
  deckSelect.value = previous;
  showStatus("");
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

/** Reflect the page's current mode in the button labels. */
function updateButtons(): void {
  furiganaButton.textContent =
    activeMode === "furigana" ? "Remove Furigana" : "Add Furigana";
  hiraganaButton.textContent =
    activeMode === "hiragana" ? "Revert to Kanji" : "Convert Kanji to Hiragana";
}

/** Disable the buttons while an operation is running. */
function setBusy(busy: boolean, note = ""): void {
  furiganaButton.disabled = busy;
  hiraganaButton.disabled = busy;
  if (busy) showStatus(note);
}

/** Show a status/warning line under the controls (empty string hides it). */
function showStatus(text: string, isWarning = false): void {
  statusLine.textContent = text;
  statusLine.hidden = text === "";
  statusLine.classList.toggle("warning", isWarning);
}
