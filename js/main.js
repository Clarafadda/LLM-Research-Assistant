import { PDFProcessor } from './pdf.js';
import { EmbeddingsEngine, VectorStore } from './transformers.js';
import { LLMEngine } from './llm.js';

const SYSTEM_PROMPT = `You are a precise Academic Research Assistant. 
Answer the user's question based ONLY on the provided Context. 
If the answer is not in the context, say "I cannot find this in the documents."
Always cite the source document name.`;

const App = (() => {
  // Application State
  const state = {
    files: [],
    chatHistory: [],
    ready: {
      emb: false,
      llm: false
    }
  };

  // UI Elements
  const els = {
    // Sidebar & Mobile
    sidebar: document.getElementById('sidebar'),
    overlay: document.getElementById('sidebarOverlay'),
    menuBtn: document.getElementById('mobileMenuBtn'),
    closeBtn: document.getElementById('closeSidebarBtn'),
    
    // Status
    embStatus: document.getElementById('embeddingStatus'),
    llmStatus: document.getElementById('llmStatus'),
    
    // Knowledge Base
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    processingStatus: document.getElementById('processingStatus'),
    memoryBank: document.getElementById('memoryBank'),
    totalVectors: document.getElementById('totalVectors'),
    
    // Chat
    chatContainer: document.getElementById('chatContainer'),
    chatInput: document.getElementById('chatInput'),
    sendBtn: document.getElementById('sendBtn'),
    inputHint: document.getElementById('inputHint'),
    
    // Settings
    modelSelect: document.getElementById('modelSelect'),
    tempSlider: document.getElementById('tempSlider'),
    tempValue: document.getElementById('tempValue'),
    tokenInput: document.getElementById('tokenInput'),
    clearBtn: document.getElementById('clearBtn')
  };

  /**
   * INITIALIZATION
   */
  async function init() {
    console.log("🚀 App Initializing...");
    setupEventListeners();
    
    // 1. Initialize Embeddings Model
    try {
      await EmbeddingsEngine.initialize();
      state.ready.emb = true;
      updateBadge(els.embStatus, "✓ Embeddings Ready", "success");
    } catch (err) {
      updateBadge(els.embStatus, "✗ Embeddings Failed", "error");
    }

    // 2. Initialize LLM
    try {
      const selectedModel = els.modelSelect.value;
      await LLMEngine.initialize(selectedModel, (progress) => {
        const p = (progress.progress * 100).toFixed(0);
        updateBadge(els.llmStatus, `Loading: ${p}%`, "loading");
      });
      state.ready.llm = true;
      updateBadge(els.llmStatus, "✓ LLM Ready", "success");
      checkSystemReady();
    } catch (err) {
      updateBadge(els.llmStatus, "✗ LLM Failed", "error");
    }
  }

  /**
   * UI HELPERS
   */
  function updateBadge(el, text, type) {
    el.textContent = text;
    const base = "text-[10px] px-2 py-1 rounded font-medium ";
    if (type === "success") el.className = base + "bg-green-100 text-green-700";
    else if (type === "error") el.className = base + "bg-red-100 text-red-700";
    else el.className = base + "bg-orange-100 text-orange-700";
  }

  function checkSystemReady() {
    if (state.ready.emb && state.ready.llm) {
      els.chatInput.disabled = false;
      els.sendBtn.disabled = false;
      els.inputHint.textContent = "System ready. Upload a PDF to begin.";
    }
  }

  function toggleMobileSidebar(show) {
    if (show) {
      els.sidebar.classList.remove('-translate-x-full');
      els.overlay.classList.remove('hidden');
    } else {
      els.sidebar.classList.add('-translate-x-full');
      els.overlay.classList.add('hidden');
    }
  }

  /**
   * EVENT LISTENERS
   */
  function setupEventListeners() {
    // Mobile Drawer
    els.menuBtn.onclick = () => toggleMobileSidebar(true);
    els.closeBtn.onclick = () => toggleMobileSidebar(false);
    els.overlay.onclick = () => toggleMobileSidebar(false);

    // File Ingestion
    els.dropZone.onclick = () => els.fileInput.click();
    els.fileInput.onchange = (e) => handleFileIngestion(Array.from(e.target.files));

    // Chat Logic
    els.sendBtn.onclick = handleChatSubmit;
    els.chatInput.onkeypress = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleChatSubmit();
      }
    };

    // Configuration
    els.tempSlider.oninput = (e) => {
      els.tempValue.textContent = e.target.value;
      LLMEngine.updateConfig({ temperature: e.target.value });
    };

    els.tokenInput.onchange = (e) => {
      LLMEngine.updateConfig({ max_tokens: e.target.value });
    };

    els.clearBtn.onclick = () => {
      if(confirm("Delete all documents and history?")) {
        VectorStore.clear();
        state.files = [];
        state.chatHistory = [];
        els.chatContainer.innerHTML = '';
        updateMemoryUI();
      }
    };
  }

  /**
   * CORE LOGIC: PDF & EMBEDDINGS
   */
  async function handleFileIngestion(files) {
    if (!state.ready.emb) return alert("Please wait for embeddings to load.");
    
    for (const file of files) {
      try {
        els.processingStatus.innerHTML = `<div class="text-[10px] text-indigo-600 animate-pulse">Reading ${file.name}...</div>`;
        
        const fileData = await PDFProcessor.processFile(file);
        const embeddings = [];
        
        // Generate embeddings for each chunk
        for (let i = 0; i < fileData.chunks.length; i++) {
          const progress = Math.round(((i + 1) / fileData.chunks.length) * 100);
          els.processingStatus.innerHTML = `<div class="text-[10px] text-indigo-600">Embedding ${file.name}: ${progress}%</div>`;
          
          const vector = await EmbeddingsEngine.generateEmbedding(fileData.chunks[i]);
          embeddings.push(vector);
        }

        // Store in Vector Store
        const entries = fileData.chunks.map((text, idx) => ({
          text: text,
          embedding: embeddings[idx],
          source: file.name
        }));
        
        VectorStore.addVectors(entries);
        state.files.push(fileData);
        
      } catch (err) {
        console.error(err);
        alert(`Failed to process ${file.name}`);
      }
    }
    
    els.processingStatus.innerHTML = "";
    updateMemoryUI();
    if (window.innerWidth < 1024) toggleMobileSidebar(false);
  }

  /**
   * CORE LOGIC: CHAT & RAG
   */
  async function handleChatSubmit() {
    const query = els.chatInput.value.trim();
    if (!query || !state.ready.llm) return;

    els.chatInput.value = '';
    els.sendBtn.disabled = true;
    appendMessage('user', query);

    try {
      // 1. Search Vector Store for Context
      const qVector = await EmbeddingsEngine.generateEmbedding(query);
      const results = await VectorStore.search(qVector, 4);
      
      const contextText = results.map(r => `[Source: ${r.source}]\n${r.text}`).join('\n\n');
      
      // 2. Prepare Prompt
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...state.chatHistory.slice(-4), // Contextual memory of last 2 turns
        { 
          role: 'user', 
          content: contextText ? `Context:\n${contextText}\n\nQuestion: ${query}` : query 
        }
      ];

      // 3. Get LLM Response
      const aiResponse = await LLMEngine.chat(messages);
      
      state.chatHistory.push({ role: 'user', content: query }, { role: 'assistant', content: aiResponse });
      appendMessage('assistant', aiResponse, results);

    } catch (err) {
      appendMessage('error', "Sorry, I encountered an error processing that.");
      console.error(err);
    } finally {
      els.sendBtn.disabled = false;
    }
  }

  function appendMessage(role, text, sources = []) {
    const div = document.createElement('div');
    div.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;
    
    let sourceHtml = '';
    if (sources.length > 0) {
      const uniqueDocs = [...new Set(sources.map(s => s.source))];
      sourceHtml = `<div class="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-1">
        ${uniqueDocs.map(d => `<span class="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">📄 ${d}</span>`).join('')}
      </div>`;
    }

    const bubbleClass = role === 'user' 
      ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none' 
      : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-none shadow-sm';

    div.innerHTML = `
      <div class="${bubbleClass} px-4 py-3 max-w-[85%] lg:max-w-[70%]">
        <div class="text-sm leading-relaxed">${text.replace(/\n/g, '<br>')}</div>
        ${sourceHtml}
      </div>
    `;

    els.chatContainer.appendChild(div);
    els.chatContainer.scrollTop = els.chatContainer.scrollHeight;
  }

  function updateMemoryUI() {
    const stats = VectorStore.getStats();
    els.totalVectors.textContent = `${stats.count} Vectors`;
    
    if (state.files.length === 0) {
      els.memoryBank.innerHTML = '<div class="text-gray-400 italic py-4">No data ingested.</div>';
      return;
    }

    els.memoryBank.innerHTML = state.files.map(f => `
      <div class="flex items-center justify-between bg-gray-50 p-2 rounded mb-1 border border-gray-100">
        <div class="truncate text-gray-700 font-medium mr-2">📄 ${f.name}</div>
        <div class="text-[9px] text-gray-400 whitespace-nowrap">${f.chunkCount} chunks</div>
      </div>
    `).join('');
  }

  return { init };
})();

// Start the application
App.init();