const algoliasearch = require('algoliasearch');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Initialize the Algolia client
const client = algoliasearch('32JX62XNGF', 'e035206c372b61c304ce9e64c5c339');
const index = client.initIndex('fg-compass-manual');

// Path to the generated HTML files
const docsDir = path.join(__dirname, 'docs');

// Function to chunk text to stay within Algolia's size limits
function chunkText(text, maxSize = 1000) {
  const chunks = [];
  
  // If the text is already small enough, return it as a single chunk
  if (text.length <= maxSize) {
    return [text];
  }
  
  // Split by sentences to maintain better context
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = '';
  
  for (const sentence of sentences) {
    // If this sentence alone is too big, split it into words
    if (sentence.length > maxSize) {
      // If we have accumulated content, add it as a chunk
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      
      // Split the long sentence into smaller pieces
      let remainingSentence = sentence;
      while (remainingSentence.length > 0) {
        chunks.push(remainingSentence.substring(0, maxSize));
        remainingSentence = remainingSentence.substring(maxSize);
      }
    }
    // If adding this sentence would exceed the limit, save current chunk and start a new one
    else if ((currentChunk + sentence).length > maxSize) {
      chunks.push(currentChunk);
      currentChunk = sentence;
    } 
    // Otherwise, add the sentence to the current chunk
    else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  
  // Add the last chunk if it's not empty
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

// Function to extract content from HTML files
async function extractContent() {
  const objects = [];
  
  // Get all HTML files
  const files = fs.readdirSync(docsDir)
    .filter(file => file.endsWith('.html'));
  
  for (const file of files) {
    const filePath = path.join(docsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(content);
    
    // Extract title
    const title = $('title').text();
    
    // Extract content from main and clean it up
    let mainContent = '';
    
    // Extract text from each section/heading to create more meaningful chunks
    $('main h1, main h2, main h3, main h4, main h5, main h6, main p').each(function() {
      const element = $(this);
      const tagName = element.prop('tagName').toLowerCase();
      const text = element.text().trim();
      
      if (text) {
        if (tagName.startsWith('h')) {
          // Add headings with some formatting
          mainContent += `\n\n${text}\n`;
        } else {
          // Add paragraphs
          mainContent += `\n${text}`;
        }
      }
    });
    
    // Clean up the text
    mainContent = mainContent.replace(/\s+/g, ' ').trim();
    
    // Chunk the content to stay within Algolia's limits
    const chunks = chunkText(mainContent);
    
    console.log(`File: ${file}, Chunks: ${chunks.length}`);
    
    // Create a record for each chunk
    chunks.forEach((chunk, i) => {
      const objectID = `${file.replace('.html', '')}_${i}`;
      
      const record = {
        objectID,
        title: title,
        content: chunk,
        url: file + (i > 0 ? `#chunk${i}` : ''),
        page: file.replace('.html', ''),
        position: i
      };
      
      objects.push(record);
    });
  }
  
  return objects;
}

// Main function to index content
async function indexContent() {
  try {
    console.log('Extracting content...');
    const objects = await extractContent();
    
    console.log(`Indexing ${objects.length} chunks from ${new Set(objects.map(obj => obj.page)).size} pages...`);
    
    // Check the size of each object
    objects.forEach((obj, index) => {
      const size = Buffer.byteLength(JSON.stringify(obj), 'utf8');
      if (size > 9000) {
        console.log(`Warning: Object ${obj.objectID} is ${size} bytes`);
      }
    });
    
    // Index in batches to avoid issues
    const batchSize = 50;
    for (let i = 0; i < objects.length; i += batchSize) {
      const batch = objects.slice(i, i + batchSize);
      console.log(`Indexing batch ${i/batchSize + 1}/${Math.ceil(objects.length/batchSize)}...`);
      const result = await index.saveObjects(batch);
      console.log(`Batch indexed with ${result.objectIDs.length} objects`);
    }
    
    console.log(`Successfully indexed all chunks!`);
  } catch (error) {
    console.error('Error indexing content:', error);
  }
}

// Run the indexing
indexContent();
