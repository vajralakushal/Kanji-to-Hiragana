import kuromoji from 'kuromoji';

export function convertKanjiToHiragana() {
  console.log("Starting conversion...");
  return new Promise((resolve, reject) => {
    initConverter((err) => {
      if (err) {
        console.error("Conversion failed:", err);
        reject(err);
      } else {
        console.log("Conversion completed successfully");
        resolve();
      }
    });
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
    
    // Test the tokenizer
    const testText = "漢字とひらがなとカタカナ";
    const testTokens = tokenizer.tokenize(testText);
    console.log("Test tokenization:", testTokens);
    
    convertText(tokenizer);
    callback(null);
  });
}

function katakanaToHiragana(str) {
  return str.replace(/[\u30A0-\u30FF]/g, function(match) {
    return String.fromCharCode(match.charCodeAt(0) - 0x60);
  });
}

function convertText(tokenizer) {
  function containsKanji(text) {
    return /[\u4e00-\u9faf]/.test(text);
  }

  function processTextNode(node) {
    const text = node.nodeValue;
    if (!containsKanji(text)) {
      console.log("No kanji found, skipping node");
      return;
    }
    console.log("Processing text node:", text.substring(0, 50) + "...");
    const tokens = tokenizer.tokenize(text);
    
    const convertedSpans = tokens.map(token => {
      let converted;
      if (token.word_type === 'KANJI' || (token.word_type === 'KNOWN' && containsKanji(token.surface_form))) {
        converted = katakanaToHiragana(token.reading);
        console.log(`Converting: ${token.surface_form} to ${converted}`);
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
  
  // Force a repaint
  document.body.style.visibility = 'hidden';
  document.body.offsetHeight; // Trigger a reflow
  document.body.style.visibility = 'visible';
}

// import kuromoji from 'kuromoji';

// export function convertKanjiToHiragana() {
//   console.log("Starting conversion...");
//   return new Promise((resolve, reject) => {
//     initConverter((err) => {
//       if (err) {
//         console.error("Conversion failed:", err);
//         reject(err);
//       } else {
//         console.log("Conversion completed successfully");
//         resolve();
//       }
//     });
//   });
// }

// function initConverter(callback) {
//   console.log("Initializing Kuromoji tokenizer...");
//   kuromoji.builder({ dicPath: chrome.runtime.getURL('dict/') }).build((err, tokenizer) => {
//     if (err) {
//       console.error("Error initializing tokenizer:", err);
//       callback(err);
//       return;
//     }
//     console.log("Tokenizer initialized successfully");
    
//     // Test the tokenizer
//     const testText = "漢字とひらがなとカタカナ";
//     const testTokens = tokenizer.tokenize(testText);
//     console.log("Test tokenization:", testTokens);
    
//     convertText(tokenizer);
//     callback(null);
//   });
// }

// function convertText(tokenizer) {
//   function containsKanji(text) {
//     return /[\u4e00-\u9faf]/.test(text);
//   }

//   function processTextNode(node) {
//     const text = node.nodeValue;
//     if (!containsKanji(text)) {
//       console.log("No kanji found, skipping node");
//       return;
//     }
//     console.log("Processing text node:", text.substring(0, 50) + "...");
//     const tokens = tokenizer.tokenize(text);
    
//     const convertedText = tokens.map(token => {
//       if (token.word_type === 'KANJI') {
//         console.log(`Converting: ${token.surface_form} to ${token.reading}`);
//         return token.reading;
//       } else if (token.word_type === 'KNOWN') {
//         // For non-KANJI known words, convert if they contain kanji
//         if (containsKanji(token.surface_form)) {
//           console.log(`Converting known word: ${token.surface_form} to ${token.reading}`);
//           return token.reading;
//         }
//       }
//       return token.surface_form;
//     }).join('');
    
//     if (text !== convertedText) {
//       console.log("Before:", text.substring(0, 50) + "...");
//       console.log("After:", convertedText.substring(0, 50) + "...");
//       node.nodeValue = convertedText;
//     } else {
//       console.log("No change needed for this node");
//     }
//   }

//   function traverseAndConvert(node) {
//     if (node.nodeType === Node.TEXT_NODE) {
//       processTextNode(node);
//     } else if (node.nodeType === Node.ELEMENT_NODE) {
//       // Skip conversion for furigana elements
//       if (node.tagName.toLowerCase() === 'ruby' || node.tagName.toLowerCase() === 'rt') {
//         return;
//       }
//       node.childNodes.forEach(child => traverseAndConvert(child));
//     }
//   }

//   console.log("Converting text...");
//   traverseAndConvert(document.body);
//   console.log("Conversion completed.");
  
//   // Force a repaint
//   document.body.style.visibility = 'hidden';
//   document.body.offsetHeight; // Trigger a reflow
//   document.body.style.visibility = 'visible';
// }