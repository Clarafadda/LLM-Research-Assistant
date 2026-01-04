/*************************************************
 * 1. GLOBAL STATE & DOM REFERENCES
 *************************************************/

const dropZone = document.getElementById("drop-zone");
const output = document.getElementById("output");

const state = {
    documents: [],
    vectorStore: [],   
    embedder: null
  };


/*************************************************
 * 2. DRAG & DROP HANDLERS
 *************************************************/

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", async (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");

  const files = [...e.dataTransfer.files].filter(
    f => f.type === "application/pdf"
  );

  for (const file of files) {
    await processPDF(file);
  }
});


/*************************************************
 * 3. PDF EXTRACTION (pdf.js)
 *************************************************/

async function processPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const pageText = content.items.map(item => item.str).join(" ");
    fullText += pageText + "\n";
  }

  // 👉 Point 4 is USED here
  const chunks = chunkText(fullText);

  state.documents.push({
    source: file.name,
    text: fullText,
    chunks
  });

  // 👉 Point 5 is USED here
  renderStatus(file.name, chunks.length);
}


/*************************************************
 * 4. TEXT CHUNKING LOGIC
 *************************************************/

function chunkText(text, chunkSize = 500, overlap = 100) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = start + chunkSize;
    const chunk = text.slice(start, end);
    chunks.push(chunk);
    start += chunkSize - overlap;
  }

  return chunks;
}


/*************************************************
 * 5. UI FEEDBACK / MEMORY PREVIEW
 *************************************************/

function renderStatus(filename, chunkCount) {
  output.textContent +=
    `📄 ${filename}\n` +
    `→ Chunks created: ${chunkCount}\n\n`;
}

async function initEmbedder() {
    if (!state.embedder) {
      state.embedder = await window.transformers.pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2"
      );
      console.log("✅ Embedding model loaded");
    }
  }