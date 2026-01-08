export const PDFProcessor = {
  async extractTextFromPDF(file) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map(item => item.str).join(' ') + '\n';
    }
    return fullText;
  },

  recursiveChunkText(text, chunkSize = 800, overlap = 100) {
    const chunks = [];
    text = text.replace(/\s+/g, ' ').trim();
    let start = 0;
    while (start < text.length) {
      let end = start + chunkSize;
      if (end >= text.length) {
        chunks.push(text.slice(start));
        break;
      }
      let breakPoint = end;
      // Try to find a period or space to break naturally
      const slice = text.slice(Math.max(start, end - 200), end);
      const lastPeriod = slice.lastIndexOf('. ');
      if (lastPeriod !== -1) breakPoint = Math.max(start, end - 200) + lastPeriod + 1;
      else {
        const lastSpace = slice.lastIndexOf(' ');
        if (lastSpace !== -1) breakPoint = Math.max(start, end - 200) + lastSpace;
      }
      chunks.push(text.slice(start, breakPoint).trim());
      start = breakPoint - overlap;
    }
    return chunks.filter(c => c.length > 50);
  },

  async processFile(file) {
    const text = await this.extractTextFromPDF(file);
    const chunks = this.recursiveChunkText(text);
    return { name: file.name, chunks, chunkCount: chunks.length };
  }
};