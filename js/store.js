import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

export const EmbeddingsEngine = (() => {
  let pipe = null;
  return {
    async initialize() {
      if(!pipe) pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      return true;
    },
    async generateEmbedding(text) {
      const output = await pipe(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    }
  };
})();

export const VectorStore = (() => {
  let store = [];
  const cosineSimilarity = (a, b) => {
    let dot = 0, nA = 0, nB = 0;
    for(let i=0; i<a.length; i++) { dot+=a[i]*b[i]; nA+=a[i]*a[i]; nB+=b[i]*b[i]; }
    return dot / (Math.sqrt(nA)*Math.sqrt(nB));
  };

  return {
    addVectors: (entries) => entries.forEach(e => store.push({ ...e, id: Date.now()+Math.random() })),
    removeBySource: (source) => { store = store.filter(i => i.source !== source); },
    search: async (queryVec, topK=5) => {
      if(!store.length) return [];
      return store.map(item => ({ ...item, similarity: cosineSimilarity(queryVec, item.embedding) }))
                  .sort((a,b) => b.similarity - a.similarity).slice(0, topK);
    },
    clear: () => { store = []; },
    getStats: () => ({ count: store.length })
  };
})();