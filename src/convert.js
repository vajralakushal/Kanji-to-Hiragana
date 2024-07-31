import kuromoji from 'kuromoji';

let originalHTML = '';
let isConverted = false;
let isFuriganaAdded = false;

export function toggleKanjiHiragana() {
  console.log("Toggling conversion...");
  return new Promise((resolve, reject) => {
    if (isConverted) {
      revertToOriginal();
      resolve();
    } else {
      initConverter((err) => {
        if (err) {
          console.error("Conversion failed:", err);
          reject(err);
        } else {
          console.log("Conversion completed successfully");
          resolve();
        }
      });
    }
  });
}

//testing this function
export function toggleFurigana() {
  console.log("Toggling furigana...");
  return new Promise((resolve, reject) => {
    if (isFuriganaAdded) {
      removeFurigana();
      resolve();
    } else {
      addFurigana((err) => {
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

function initConverter(callback) {
  console.log("Initializing Kuromoji tokenizer...");
  kuromoji.builder({ dicPath: chrome.runtime.getURL('dict/') }).build((err, tokenizer) => {
    if (err) {
      console.error("Error initializing tokenizer:", err);
      callback(err);
      return;
    }
    console.log("Tokenizer initialized successfully");
    
    // // Test the tokenizer
    // const testText = "漢字とひらがなとカタカナ";
    // const testTokens = tokenizer.tokenize(testText);
    // console.log("Test tokenization:", testTokens);
    
    convertText(tokenizer);
    callback(null);
  });
}

//testing next two functions
function addFurigana(callback) {
  console.log("Adding furigana...");
  kuromoji.builder({ dicPath: chrome.runtime.getURL('dict/') }).build((err, tokenizer) => {
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

    //testing this
    function hasExistingFurigana(node) {
      return node.parentNode.nodeName.toLowerCase() === 'ruby' ||
             (node.parentNode.parentNode && node.parentNode.parentNode.nodeName.toLowerCase() === 'ruby');
    }

    function processTextNode(node) {

      //testing thsi too
      if (hasExistingFurigana(node)) {
        return; // Skip if the node already has furigana
      }

      const text = node.nodeValue;
      if (!text.split('').some(isKanji)) {
        return; // Skip if there's no kanji in the text
      }
      const tokens = tokenizer.tokenize(text);
      
      const furiganaSpans = tokens.map(token => {
        if (token.word_type === 'KNOWN' && token.surface_form.split('').some(isKanji)) {
          return `<ruby>${token.surface_form}<rt>${katakanaToHiragana(token.reading)}</rt></ruby>`;
        } else {
          return token.surface_form;
        }
      }).join('');
      
      const span = document.createElement('span');
      span.innerHTML = furiganaSpans;
      node.parentNode.replaceChild(span, node);
    }

    function traverseAndAddFurigana(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        processTextNode(node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
          //testing this if
          if (node.nodeName.toLowerCase() === 'ruby') {
            return; // Skip processing for existing ruby elements
          }
        Array.from(node.childNodes).forEach(child => traverseAndAddFurigana(child));
      }
    }

    traverseAndAddFurigana(document.body);
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

function convertText(tokenizer) {
  originalHTML = document.body.innerHTML;
  
  function containsKanji(text) {
    return /[\u4e00-\u9faf]/.test(text);
  }

  function processTextNode(node) {
    const text = node.nodeValue;
    if (!containsKanji(text)) {
      //console.log("No kanji found, skipping node");
      return;
    }
    //console.log("Processing text node:", text.substring(0, 50) + "...");
    const tokens = tokenizer.tokenize(text);
    
    const convertedSpans = tokens.map(token => {
      let converted;
      if (token.word_type === 'KANJI' || (token.word_type === 'KNOWN' && containsKanji(token.surface_form))) {
        converted = katakanaToHiragana(token.reading);
        //console.log(`Converting: ${token.surface_form} to ${converted}`);
      } else {
        converted = token.surface_form;
      }
      
      if (converted !== token.surface_form) {
        return `<span class="converted-word" data-original="${token.surface_form}" style="text-decoration: underline; text-decoration-thickness: 1px; cursor: pointer;">${converted}</span>`;
      } else {
        return converted;
      }
    }).join('');
    
    const span = document.createElement('span');
    span.innerHTML = convertedSpans;
    span.addEventListener('click', function(e) {
      if (e.target.classList.contains('converted-word')) {
        const current = e.target.textContent;
        e.target.textContent = e.target.dataset.original;
        e.target.dataset.original = current;
      }
    });
    
    node.parentNode.replaceChild(span, node);
  }

  function traverseAndConvert(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      processTextNode(node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Skip conversion for furigana elements
      if (node.tagName.toLowerCase() === 'ruby' || node.tagName.toLowerCase() === 'rt') {
        return;
      }
      Array.from(node.childNodes).forEach(child => traverseAndConvert(child));
    }
  }

  console.log("Converting text...");
  traverseAndConvert(document.body);
  console.log("Conversion completed.");
  isConverted = true;
  
  // Force a repaint
  document.body.style.visibility = 'hidden';
  document.body.offsetHeight; // Trigger a reflow
  document.body.style.visibility = 'visible';
}

function revertToOriginal() {
  document.body.innerHTML = originalHTML;
  isConverted = false;
  isFuriganaAdded = false;
  console.log("Reverted to original text.");
}