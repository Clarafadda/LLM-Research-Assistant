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
  
    const chunks = chunkText(fullText);
  
    state.documents.push({
      source: file.name,
      text: fullText,
      chunks
    });
  
    renderStatus(file.name, chunks.length);
  }

  
  async function processPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
    let fullText = "";
  
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      fullText += content.items.map(item => item.str).join(" ") + "\n";
    }
  
    const chunks = chunkText(fullText);
  
    await initEmbedder();
  
    for (const chunk of chunks) {
      const embedding = await embedText(chunk);
  
      state.vectorStore.push({
        text: chunk,
        embedding,
        source: file.name
      });
    }
  
    renderStatus(file.name, chunks.length);
  }

  async function embedText(text) {
    const output = await state.embedder(text, {
      pooling: "mean",
      normalize: true
    });
  
    return output.data;
  }

  function cosineSimilarity(vecA, vecB) {
    let dot = 0.0;
    let normA = 0.0;
    let normB = 0.0;
  
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
  
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  async function search(query, topK = 3) {
    await initEmbedder();
  
    const queryEmbedding = await embedText(query);
  
    const scores = state.vectorStore.map(item => ({
      text: item.text,
      source: item.source,
      score: cosineSimilarity(queryEmbedding, item.embedding)
    }));
  
    scores.sort((a, b) => b.score - a.score);
  
    console.log("🔍 Search results:", scores.slice(0, topK));
  }

  async function search(query, topK = 3) {
    await initEmbedder();
  
    const queryEmbedding = await embedText(query);
  
    const scores = state.vectorStore.map(item => ({
      text: item.text,
      source: item.source,
      score: cosineSimilarity(queryEmbedding, item.embedding)
    }));
  
    scores.sort((a, b) => b.score - a.score);
  
    console.log("🔍 Search results:", scores.slice(0, topK));
  }
  