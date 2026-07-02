# ADA Studio

ADA Studio is a legal AI workspace for building and running source-grounded legal tools. It combines document RAG, case-law research, drafting, comparison, chronology building, camera OCR, guided reading, and export workflows in one React application with a Cloudflare Worker backend.

> ADA Studio provides AI-generated legal information, not legal advice. Verify important outputs against source documents and current law before relying on them.

## Key Features

- Unified Studio hub for app creation, tools, research, drafting, and exports.
- Natural-language legal app builder with selectable modules.
- Document RAG with PDF, DOCX, TXT, and MD ingestion.
- R2-backed document storage and parser queue support for larger files.
- Ollama Cloud or local Ollama model selection for assistant and tool responses.
- Case-law search with AI summaries and BAILII links.
- Drafting Tool for legal correspondence, including letters of claim and settlement letters.
- Chronology Builder for extracting dated matter events.
- Mini Model Lab for preparing JSONL datasets, training tiny browser language models, testing them in a ChatGPT-style playground, saving experiments, and exporting configs for GPU training workflows.
- Compare tool for side-by-side document review.
- Standalone Camera Document AI at `/camera` for photo/screenshot OCR, source-type-aware summaries, chat, saved note folders, and Word/PDF exports.
- Guided Reader with file upload, camera OCR, summary, chat, and document export.
- Matter bundle and structured export support for Word, PDF, and PowerPoint-style outputs.

## Tech Stack

- React 19
- React Router 7
- CRACO / Create React App
- Tailwind CSS
- Lucide icons
- Cloudflare Pages Functions / Worker
- Cloudflare KV
- Cloudflare R2
- Cloudflare Queues
- Cloudflare Workers AI for OCR fallback
- Ollama Cloud or local Ollama for selected LLM models

## Repository Layout

```text
cloudflare/
  _worker.js           Cloudflare Pages/Worker API and app backend
  parser-worker.js     Queue consumer for asynchronous document parsing
src/
  components/          Shared React components
  lib/                 API client, exports, drafting helpers, tests
  pages/               Studio, app detail, standalone tools, landing pages
public/                CRA public assets
wrangler.jsonc         Cloudflare Pages/Worker deployment config
wrangler.parser.jsonc  Parser Worker deployment config
```

## Local Development

Install dependencies:

```bash
npm install
```

Start the React dev server:

```bash
npm start
```

The app runs at:

```text
http://localhost:3000
```

Build for production:

```bash
npm run build
```

Build for Cloudflare Pages:

```bash
npm run build:cloudflare
```

Run tests:

```bash
npm test -- --watchAll=false
```

Run the focused regression tests:

```bash
npm test -- --watchAll=false src/lib/draftingTool.test.js
```

## Cloudflare Setup

The app expects these Cloudflare resources:

- KV namespace bound as `ADA_KV`
- R2 bucket bound as `DOCUMENTS_R2`
- Queue producer and consumer for `ada-studio-parse`
- Workers AI binding as `AI`
- Parser Worker deployed from `cloudflare/parser-worker.js`

The checked-in configs are:

- `wrangler.jsonc` for the main Pages/Worker deployment
- `wrangler.parser.jsonc` for the parser Worker

Before production deployment, replace placeholder resource IDs and secrets with values from your Cloudflare account.

## Required Secrets

Set these as Cloudflare secrets rather than committing them:

```bash
wrangler secret put JWT_SECRET
wrangler secret put OLLAMA_API_KEY
```

Optional:

```bash
wrangler secret put OLLAMA_HOST
```

`OLLAMA_HOST` defaults to `https://ollama.com` if not provided.

For local Ollama development, run Ollama locally and point the backend at it:

```bash
ollama serve
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:latest
```

When `OLLAMA_HOST` is `localhost`, `127.0.0.1`, or `[::1]`, the backend calls Ollama without requiring `OLLAMA_API_KEY`. The optional `OLLAMA_MODEL` value controls the backend's default model for local generation. The `/api/meta/models` endpoint will also try to read live model names from local Ollama's `/api/tags` endpoint.

For local React development, create a local `.env` only if the frontend needs to call a separate backend:

```bash
REACT_APP_BACKEND_URL=http://localhost:8787
```

Do not commit `.env` files.

## Deployment

Build the app and copy the Worker into the build output:

```bash
npm run build:cloudflare
```

Deploy the main Cloudflare app:

```bash
wrangler pages deploy build --project-name ada-studio
```

Deploy the parser Worker:

```bash
wrangler deploy --config wrangler.parser.jsonc
```

If your Cloudflare account uses different project, bucket, queue, or KV names, update the Wrangler config files before deploying.

## Important Routes

- `/` - landing page
- `/studio` - unified Studio hub
- `/camera` - standalone Camera Document AI
- `/studio?tab=model-lab` - Mini Model Lab for dataset preparation and small browser model experiments
- `/apps/:appId` - generated legal app detail page
- `/camera-ai` and `/camera-ocr` - compatibility redirects to `/camera`
- `/brief-builder` - compatibility redirect to the Drafting Tool route

## Validation

Recently verified:

```bash
npm test -- --watchAll=false src/lib/draftingTool.test.js
npm run build
```

The production build may show an existing React hook dependency warning in `src/pages/AppDetail.jsx`; it does not block compilation.

## Notes

- Keep `node_modules`, `build`, `.wrangler`, local `.env` files, Playwright scratch files, and generated presentation outputs out of git.
- The backend is designed to prefer the selected Ollama model, including local Ollama models when `OLLAMA_HOST` points at a local server.
- OCR quality depends on image clarity, lighting, and the availability of Cloudflare AI OCR support.
