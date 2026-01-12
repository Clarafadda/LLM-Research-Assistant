# Local AI Literature Review Assistant 

A fully client-side, privacy-first AI research assistant that ingests academic PDFs, builds a local vector database in the browser, and generates high-quality literature reviews using a Retrieval-Augmented Generation (RAG) pipeline.

⚠️ **No data ever leaves your machine.**  
All computation (LLM inference, embeddings, retrieval) runs locally in your browser.

---

## Interface Preview

![Interface Screenshot](./assets/screenshot.png)



---

## Features

- Upload and parse PDF research papers
- Intelligent text chunking
- Local embeddings with Transformers.js
- Client-side Vector Store 
- Retrieval-Augmented Generation (RAG)
- Automated Literature Review synthesis
- 100% local & privacy-first

---

## Tech Stack

| Layer | Technology |
|-----|-----------|
| LLM Inference | **WebLLM** |
| Embeddings | **Transformers.js** |
| Frontend | **Vanilla JavaScript** |
| Styling | **Tailwind CSS** |
| PDF Parsing | **PDF.js** |
| Hosting | Local static server |

---

## Privacy-First Design 

This project is intentionally designed as a local AI system:

- No cloud APIs
- No server-side processing
- No data collection
- Runs entirely in the browser
- Research papers stay on your device
- Ideal for confidential or unpublished work

This ensures data sovereignty, reproducibility, and compliance with privacy constraints.

---

## 📂 Project Structure

