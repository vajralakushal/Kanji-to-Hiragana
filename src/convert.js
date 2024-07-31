import kuromoji from 'kuromoji';

let originalHTML = '';
let isConverted = false;
let isFuriganaAdded = false;

export function toggleKanjiHiragana(ankiEnabled, selectedDeck) {
  console.log("Toggling conversion...");
  return new Promise((resolve, reject) => {
    if (isConverted) {
      revertToOriginal();
      isConverted = false;
      resolve();
    } else {
      initConverter(ankiEnabled, selectedDeck, (err) => {
        if (err) {
          console.error("Conversion failed:", err);
          reject(err);
        } else {
          console.log("Conversion completed successfully");
          isConverted = true;
          resolve();
        }
      });
    }
  });
}

export function toggleFurigana(ankiEnabled, selectedDeck) {
  console.log("Toggling furigana...");
  return new Promise((resolve, reject) => {
    if (isFuriganaAdded) {
      removeFurigana();
      resolve();
    } else {
      addFurigana(ankiEnabled, selectedDeck, (err) => {
        if (err) {
          console.error("Adding furigana failed:", err);
          reject(err);
        } else {
          console.log("Furigana added successfully");
          resolve();
        }
      });
    }
  });
}

function initConverter(ankiEnabled, selectedDeck, callback) {
  console.log("Initializing Kuromoji tokenizer...");
  kuromoji.builder({ dicPath: chrome.runtime.getURL('dict/') }).build((err, tokenizer) => {
    if (err) {
      console.error("Error initializing tokenizer:", err);
      callback(err);
      return;
    }
    console.log("Tokenizer initialized successfully");
    convertText(tokenizer, ankiEnabled, selectedDeck);
    callback(null);
  });
}

async function convertText(tokenizer, ankiEnabled, selectedDeck) {
  originalHTML = document.body.innerHTML;
  
  function isKanji(char) {
    return (char >= '\u4e00' && char <= '\u9faf') || (char >= '\u3400' && char <= '\u4dbf');
  }

  async function processTextNode(node) {
    const text = node.nodeValue;
    if (!text.split('').some(isKanji)) {
      return; // Skip if there's no kanji in the text
    }
    const tokens = tokenizer.tokenize(text);
    
    const convertedSpans = await Promise.all(tokens.map(async token => {
      if (token.word_type === 'KNOWN' && token.surface_form.split('').some(isKanji)) {
        if (ankiEnabled) {
          const cardStatus = await checkAnkiCardStatus(token.surface_form, selectedDeck);
          if (cardStatus !== 'new') {
            return token.surface_form;
          }
        }
        const converted = token.surface_form.split('').map(char => {
          if (isKanji(char)) {
            return `<span class="converted-word" data-original="${char}" style="text-decoration: underline; text-decoration-thickness: 1px; cursor: pointer;">${katakanaToHiragana(token.reading)}</span>`;
          }
          return char;
        }).join('');
        return converted;
      } else {
        return token.surface_form;
      }
    }));
    
    const span = document.createElement('span');
    span.innerHTML = convertedSpans.join('');
    span.addEventListener('click', function(e) {
      if (e.target.classList.contains('converted-word')) {
        const current = e.target.textContent;
        e.target.textContent = e.target.dataset.original;
        e.target.dataset.original = current;
      }
    });
    
    node.parentNode.replaceChild(span, node);
  }

  async function traverseAndConvert(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      await processTextNode(node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Skip conversion for furigana elements
      if (node.tagName.toLowerCase() === 'ruby' || node.tagName.toLowerCase() === 'rt') {
        return;
      }
      for (const child of node.childNodes) {
        await traverseAndConvert(child);
      }
    }
  }

  console.log("Converting text...");
  await traverseAndConvert(document.body);
  console.log("Conversion completed.");
  isConverted = true;
  
  // Force a repaint
  document.body.style.visibility = 'hidden';
  document.body.offsetHeight; // Trigger a reflow
  document.body.style.visibility = 'visible';
}

async function addFurigana(ankiEnabled, selectedDeck, callback) {
  console.log("Adding furigana...");
  kuromoji.builder({ dicPath: chrome.runtime.getURL('dict/') }).build(async (err, tokenizer) => {
    if (err) {
      console.error("Error initializing tokenizer:", err);
      callback(err);
      return;
    }
    console.log("Tokenizer initialized successfully");
    
    if (!isConverted) {
      originalHTML = document.body.innerHTML;
    }
    
    function isKanji(char) {
      return (char >= '\u4e00' && char <= '\u9faf') || (char >= '\u3400' && char <= '\u4dbf');
    }

    function hasExistingFurigana(node) {
      return node.parentNode.nodeName.toLowerCase() === 'ruby' ||
             (node.parentNode.parentNode && node.parentNode.parentNode.nodeName.toLowerCase() === 'ruby');
    }

    async function processTextNode(node) {
      if (hasExistingFurigana(node)) {
        return; // Skip if the node already has furigana
      }

      const text = node.nodeValue;
      if (!text.split('').some(isKanji)) {
        return; // Skip if there's no kanji in the text
      }

      const tokens = tokenizer.tokenize(text);
      
      const furiganaSpans = await Promise.all(tokens.map(async token => {
        if (token.word_type === 'KNOWN' && token.surface_form.split('').some(isKanji)) {
          if (ankiEnabled) {
            const cardStatus = await checkAnkiCardStatus(token.surface_form, selectedDeck);
            if (cardStatus !== 'new') {
              return token.surface_form;
            }
          }
          return `<ruby>${token.surface_form}<rt>${katakanaToHiragana(token.reading)}</rt></ruby>`;
        } else {
          return token.surface_form;
        }
      }));
      
      const span = document.createElement('span');
      span.innerHTML = furiganaSpans.join('');
      node.parentNode.replaceChild(span, node);
    }

    async function traverseAndAddFurigana(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        await processTextNode(node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.nodeName.toLowerCase() === 'ruby') {
          return; // Skip processing for existing ruby elements
        }
        for (const child of node.childNodes) {
          await traverseAndAddFurigana(child);
        }
      }
    }

    await traverseAndAddFurigana(document.body);
    isFuriganaAdded = true;
    callback(null);
  });
}

function removeFurigana() {
  document.body.innerHTML = originalHTML;
  isFuriganaAdded = false;
  isConverted = false;
  console.log("Furigana removed.");
}

function katakanaToHiragana(str) {
  return str.replace(/[\u30A0-\u30FF]/g, function(match) {
    return String.fromCharCode(match.charCodeAt(0) - 0x60);
  });
}

export function revertToOriginal() {
  document.body.innerHTML = originalHTML;
  isConverted = false;
  isFuriganaAdded = false;
  console.log("Reverted to original text.");
}

async function checkAnkiCardStatus(word, deck) {
  const response = await fetch('http://localhost:8765', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'findCards',
      version: 6,
      params: {
        query: `deck:"${deck}" "front:${word}"`
      }
    }),
  });

  const data = await response.json();
  
  if (data.result.length === 0) {
    return 'new';
  }

  const cardInfoResponse = await fetch('http://localhost:8765', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'cardsInfo',
      version: 6,
      params: {
        cards: data.result
      }
    }),
  });

  const cardInfo = await cardInfoResponse.json();
  
  // Assuming the first card if multiple exist
  const card = cardInfo.result[0];
  
  if (card.interval < 21) {
    return 'learning';
  } else {
    return 'mature';
  }
}