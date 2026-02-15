<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 6" />
  <img src="https://img.shields.io/badge/FastAPI-0.109-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Gemini_2.5_Flash-AI-8E75B2?style=for-the-badge&logo=google&logoColor=white" alt="Gemini 2.5 Flash" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Tests-101_Passing-22C55E?style=for-the-badge&logo=vitest&logoColor=white" alt="Tests" />
</p>

<h1 align="center">⚡ LectureSynth</h1>

<p align="center">
  <strong>Transform PDF lectures into structured knowledge — instantly.</strong><br/>
  AI-powered slide analysis that turns your lecture PDFs into flashcards, Obsidian vaults, and presentations.
</p>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **AI Slide Analysis** | Gemini 2.5 Flash analyzes each slide image, extracting concepts and generating concise explanations |
| 🎯 **Smart Slide Filtering** | Automatically detects and skips title pages, section dividers, and empty slides |
| 🖥️ **In-App Slide Viewer** | Interactive presentation viewer with navigation, thumbnails, and fullscreen mode |
| 📦 **Obsidian Vault Export** | Download a complete vault with interlinked markdown notes, ready to drop into Obsidian |
| 📊 **PowerPoint Export** | Generate `.pptx` files with slide images and concepts — compatible with PowerPoint, Google Slides, and Keynote |
| 💾 **Project Persistence** | Save and reload processed lectures from the dashboard |
| 📁 **Directory Save** | Write vault files directly to a folder on your machine via the File System Access API |
| ⚡ **Concurrent Processing** | Processes 3 slides simultaneously with automatic rate-limit backoff |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (React 19)                   │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │  Upload   │→│ Consent  │→│Processing│→│  Results    │  │
│  │          │  │ (limits) │  │(parallel)│  │(viewer/    │  │
│  │  PDF     │  │          │  │          │  │ exports)   │  │
│  └──────────┘  └──────────┘  └────┬─────┘  └────────────┘  │
│                                   │                         │
│         PDF.js (client-side)      │  PptxGenJS / JSZip      │
│         renders pages ────────────┤  generates exports      │
│                                   │                         │
└───────────────────────────────────┼─────────────────────────┘
                                    │ POST /analyze
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Backend (:8000)                  │
│                                                             │
│  ┌──────────────────┐     ┌─────────────────────────────┐  │
│  │   AI Engine       │     │   Storage Engine             │  │
│  │                   │     │                              │  │
│  │  Gemini 2.5 Flash │     │  temp_storage/               │  │
│  │  JSON schema mode │     │  saved_storage/              │  │
│  │  skip detection   │     │                              │  │
│  └──────────────────┘     └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **Google Gemini API Key** → [Get one here](https://aistudio.google.com/app/apikey)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd module

# Frontend
npm install

# Backend
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your Gemini API key:
# GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Run

```bash
# Terminal 1 — Backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend
npm run dev
```

Open **http://localhost:5173** and upload a PDF.

---

## 🐳 Docker Deployment

A one-command deployment script handles everything:

```bash
chmod +x run_docker.sh
./run_docker.sh
```

This builds and starts both containers on a shared network:

| Service | Port | URL |
|---|---|---|
| Frontend (Nginx) | `3000` | http://localhost:3000 |
| Backend (Uvicorn) | `8000` | http://localhost:8000 |

> [!NOTE]
> Ensure your `.env` file exists with `GEMINI_API_KEY` set before running.

---

## 📂 Project Structure

```
module/
├── app/                        # FastAPI backend
│   ├── main.py                 # API routes (upload, analyze, store, delete)
│   ├── core.py                 # LectureSynth orchestrator
│   ├── models.py               # Pydantic models (Lecture, Flashcard)
│   ├── schemas.py              # Request schemas
│   ├── services/
│   │   ├── ai_engine.py        # Gemini integration & slide classification
│   │   └── pdf_engine.py       # PDF processing engine
│   └── tests/                  # Backend tests
│
├── components/                 # React components
│   ├── Upload.tsx              # Drag & drop PDF upload
│   ├── Consent.tsx             # Page count review & limit config
│   ├── Processing.tsx          # Real-time processing progress
│   ├── Results.tsx             # Results dashboard with view toggle
│   ├── SlideViewer.tsx         # In-app presentation viewer
│   ├── SavedProjects.tsx       # Project library
│   └── __tests__/              # Component tests (60+ tests)
│
├── services/                   # Frontend services
│   ├── geminiService.ts        # Backend API proxy
│   ├── pdfService.ts           # Client-side PDF rendering (PDF.js)
│   └── exportService.ts        # Obsidian vault & PPTX generation
│
├── App.tsx                     # Main application shell
├── types.ts                    # TypeScript types
├── Dockerfile                  # Frontend (multi-stage → Nginx)
├── Dockerfile.backend          # Backend (Python slim)
└── run_docker.sh               # One-command deployment
```

---

## 🧪 Testing

**101 tests** across **10 test files**, powered by [Vitest](https://vitest.dev) + React Testing Library.

```bash
# Run all tests
npx vitest run

# Watch mode
npx vitest

# Verbose output
npx vitest run --reporter=verbose
```

| Suite | Tests | Covers |
|---|---|---|
| `Upload.test.tsx` | 8 | File input, drag-drop, PDF validation |
| `Consent.test.tsx` | 8 | Loading, error states, page limits |
| `Processing.test.tsx` | 7 | Progress, completion, failures, skip detection |
| `Results.test.tsx` | 22 | Cards, exports, save, skip badges, view toggle |
| `SlideViewer.test.tsx` | 13 | Navigation, thumbnails, fullscreen, filtering |
| `SavedProjects.test.tsx` | 8 | List, select, delete, error handling |
| `App.test.tsx` | 9 | Dashboard, tabs, navigation flows |
| `geminiService.test.ts` | 6 | Fetch API, errors, retry logic |
| `exportService.test.ts` | 14 | ZIP vault, markdown, PptxGenJS |
| `pdfService.test.ts` | 2 | PDF loading, page rendering |

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/analyze` | Analyze a slide image via Gemini AI |
| `POST` | `/upload` | Upload a PDF for background processing |
| `GET` | `/lectures` | List all saved lectures |
| `GET` | `/lectures/:id` | Get lecture status and data |
| `POST` | `/lectures/store` | Store a client-processed lecture |
| `POST` | `/lectures/:id/save` | Move lecture to permanent storage |
| `DELETE` | `/lectures/:id` | Delete a stored lecture |
| `GET` | `/lectures/:id/download` | Download Obsidian vault as ZIP |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript 5.8, Vite 6, Tailwind CSS |
| **Backend** | FastAPI, Python 3.10, Uvicorn |
| **AI** | Google Gemini 2.5 Flash (structured JSON output) |
| **PDF** | PDF.js (client), pdf2image (server) |
| **Exports** | PptxGenJS, JSZip |
| **Testing** | Vitest, React Testing Library, pytest |
| **Deployment** | Docker (Nginx + Uvicorn), multi-stage builds |
| **Typography** | Inter (Google Fonts) |

---

## 📄 License

This project is private. All rights reserved.
