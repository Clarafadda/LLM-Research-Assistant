import { CreateMLCEngine } from 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.46/lib/index.min.js';

export const LLMEngine = (() => {
  let engine = null;
  let config = { temperature: 0.3, max_tokens: 1024, top_p: 0.7 };
  let currentModelId = "Phi-3-mini-4k-instruct-q4f16_1-MLC";

  return {
    async initialize(modelId, progressCallback) {
      currentModelId = modelId || currentModelId;
      engine = await CreateMLCEngine(currentModelId, { initProgressCallback: progressCallback });
      return true;
    },
    updateConfig: (newConfig) => { config = { ...config, ...newConfig }; },
    async chat(messages) {
      const res = await engine.chat.completions.create({
        messages, ...config, temperature: parseFloat(config.temperature), max_tokens: parseInt(config.max_tokens)
      });
      return res.choices[0].message.content;
    },
    getModelId: () => currentModelId
  };
})();