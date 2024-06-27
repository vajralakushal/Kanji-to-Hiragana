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
    
    const convertedText = tokens.map(token => {
      if (token.word_type === 'KANJI') {
        console.log(`Converting: ${token.surface_form} to ${token.reading}`);
        return token.reading;
      } else if (token.word_type === 'KNOWN') {
        // For non-KANJI known words, convert if they contain kanji
        if (containsKanji(token.surface_form)) {
          console.log(`Converting known word: ${token.surface_form} to ${token.reading}`);
          return token.reading;
        }
      }
      return token.surface_form;
    }).join('');
    
    if (text !== convertedText) {
      console.log("Before:", text.substring(0, 50) + "...");
      console.log("After:", convertedText.substring(0, 50) + "...");
      node.nodeValue = convertedText;
    } else {
      console.log("No change needed for this node");
    }
  }

  function traverseAndConvert(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      processTextNode(node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Skip conversion for furigana elements
      if (node.tagName.toLowerCase() === 'ruby' || node.tagName.toLowerCase() === 'rt') {
        return;
      }
      node.childNodes.forEach(child => traverseAndConvert(child));
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

// // This is the main function to start the conversion process
// export function convertKanjiToHiragana() {
//   console.log("Starting conversion...");
//   initConverter();
// }

// // This function initializes the Kuromoji tokenizer
// function initConverter() {
//   console.log("Initializing Kuromoji tokenizer...");
//   // Build the tokenizer with the path to the dictionary files
//   kuromoji.builder({ dicPath: chrome.runtime.getURL('dict/') }).build((err, tokenizer) => {
//     if (err) {
//       console.error("Error initializing tokenizer:", err);
//       return;
//     }
//     console.log("Tokenizer initialized successfully");
//     // Once the tokenizer is initialized, start converting text
//     convertText(tokenizer);
//   });
// }

// // This function converts the text nodes by replacing Kanji with Hiragana
// function convertText(tokenizer) {
//   // Function to process a text node and replace Kanji with Hiragana
//   function processTextNode(node) {
//     const text = node.nodeValue;  // Get text content from the text node
//     console.log("Processing text node:", text);
//     const tokens = tokenizer.tokenize(text);  // Tokenize the text
//     console.log("Tokenized text:", tokens);
//     const convertedText = tokens.map(token => {
//       // Convert Kanji to Hiragana if the token is of type 'KANJI'
//       return token.word_type === 'KANJI' ? token.reading : token.surface_form;
//     }).join('');  // Join the converted tokens back into a string

//     console.log("Converted text:", convertedText);
//     node.nodeValue = convertedText;  // Set the converted text back to the text node
//   }

//   // Recursive function to traverse and convert text nodes
//   function traverseAndConvert(node) {
//     if (node.nodeType === Node.TEXT_NODE) {  // Check if the node is a text node
//       processTextNode(node);  // Process the text node
//     } else {
//       node.childNodes.forEach(child => traverseAndConvert(child));  // Recursively process child nodes
//     }
//   }

//   // Start the traversal and conversion from the body element
//   console.log("Converting text...");
//   traverseAndConvert(document.body);
//   console.log("Conversion completed.");
// }


// import kuromoji from 'kuromoji';

// export function convertKanjiToHiragana() {
//   console.log("Starting conversion...");
//   initConverter();
// }

// function initConverter() {
//   console.log("Initializing Kuromoji tokenizer...");
//   kuromoji.builder({ dicPath: chrome.runtime.getURL('dict/') }).build((err, tokenizer) => {
//     if (err) {
//       console.error("Error initializing tokenizer:", err);
//       return;
//     }
//     console.log("Tokenizer initialized successfully");
//     convertText(tokenizer);
//   });
// }

// function convertText(tokenizer) {
//   const bodyText = document.body.innerHTML;
  
//   // First, let's remove HTML tags
//   const textWithoutTags = bodyText.replace(/<[^>]*>/g, '');
  
//   const tokens = tokenizer.tokenize(textWithoutTags);
  
//   const convertedText = tokens.map(token => {
//     if (token.pos === '漢字') {
//       // Convert Kanji to Hiragana
//       return token.reading;
//     } else if (token.pos === 'カタカナ') {
//       // Preserve Katakana
//       return token.surface_form;
//     } else {
//       // For other types (including Hiragana), use the surface form
//       return token.surface_form;
//     }
//   }).join('');

//   // Reinsert the converted text into the body
//   document.body.innerHTML = convertedText;
// }