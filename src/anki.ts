/**
 * Minimal AnkiConnect client.
 *
 * Only ever imported by the background service worker: the extension has a
 * host permission for http://localhost:8765, so fetches made from the worker
 * bypass AnkiConnect's CORS restrictions that would block a web page.
 *
 * AnkiConnect protocol: POST a JSON body of {action, version, params} and
 * receive {result, error}. See https://foosoft.net/projects/anki-connect/
 */

const ANKI_CONNECT_URL = "http://localhost:8765";
const ANKI_CONNECT_VERSION = 6;

/** Shape of every AnkiConnect response. Exactly one of the fields is set. */
interface AnkiConnectResponse<T> {
  result: T | null;
  error: string | null;
}

/** The subset of AnkiConnect's notesInfo result that we use. */
interface NoteInfo {
  fields: Record<string, { value: string; order: number }>;
}

/**
 * Send one action to AnkiConnect and return its result.
 * Throws with a readable message if Anki isn't running or the action fails.
 */
async function invoke<T>(action: string, params?: object): Promise<T> {
  let response: Response;
  try {
    response = await fetch(ANKI_CONNECT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, version: ANKI_CONNECT_VERSION, params }),
    });
  } catch {
    throw new Error(
      "Could not reach AnkiConnect. Is Anki running with the AnkiConnect add-on installed?"
    );
  }

  const data = (await response.json()) as AnkiConnectResponse<T>;
  if (data.error !== null) {
    throw new Error(`AnkiConnect error: ${data.error}`);
  }
  return data.result as T;
}

/** Return the names of all decks in the user's Anki collection. */
export function getDeckNames(): Promise<string[]> {
  return invoke<string[]>("deckNames");
}

/**
 * Return the set of words in `deck` that the user has studied at least once.
 *
 * "Studied at least once" is expressed with Anki's `-is:new` search flag:
 * a note matches if any of its cards has left the "new" queue. Cards merely
 * sitting in the deck unreviewed do NOT count as known.
 *
 * The word for each note is taken from its *first* field (order 0), which by
 * Anki convention holds the expression regardless of what the field is named
 * (Front, Expression, Word, ...). Fetching every note once and building a Set
 * is far faster than querying AnkiConnect per word on the page.
 */
export async function getKnownWords(deck: string): Promise<string[]> {
  // Deck names may contain double quotes; escape them for the search query.
  const escapedDeck = deck.replace(/"/g, '\\"');
  const noteIds = await invoke<number[]>("findNotes", {
    query: `deck:"${escapedDeck}" -is:new`,
  });
  if (noteIds.length === 0) {
    return [];
  }

  const notes = await invoke<NoteInfo[]>("notesInfo", { notes: noteIds });

  const words = new Set<string>();
  for (const note of notes) {
    const firstField = Object.values(note.fields).find((f) => f.order === 0);
    if (!firstField) continue;
    const word = cleanFieldValue(firstField.value);
    if (word) {
      words.add(word);
    }
  }
  return [...words];
}

/**
 * Reduce a raw Anki field value to the bare word it represents.
 *
 * Japanese decks commonly decorate the expression field, e.g.:
 *   - HTML markup:        `<b>食べる</b>` or ruby tags
 *   - bracketed readings: `食[た]べる` (Anki's furigana syntax)
 *   - stray whitespace / non-breaking spaces
 */
function cleanFieldValue(value: string): string {
  return value
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/\[[^\]]*\]/g, "") // strip [reading] furigana annotations
    .replace(/&nbsp;/g, " ")
    .trim();
}
