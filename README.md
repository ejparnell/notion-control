# Notion Control

Notion Control is a private productivity dashboard for planning projects, tracking tasks, and working with AI-assisted workflows. It combines a Next.js App Router interface, MongoDB-backed project/task data, Notion API integration, DeepSeek-powered chat agents, and a local-memory RAG system for grounding chat in private notes.

The app is intentionally operator-focused: projects and tasks can be viewed in table/kanban-style workflows, detail pages include assistant clarifiers, and the agent orchestrator can draft structured work for human approval instead of mutating data automatically.

## Features

- Project and task dashboards backed by MongoDB/Mongoose
- Project and task detail pages with edit, delete, related-work, and clarifier chat flows
- Multi-agent planning chat that can draft projects, child tasks, and assignment suggestions
- General chat grounded by private local-memory Markdown files
- Notion API helpers for querying configured project/task databases
- Server-only Gmail querying layer for mailbox, thread, body, label, and attachment metadata
- Local RAG ingestion, validation, and evaluation scripts

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- MongoDB with Mongoose
- Notion SDK
- DeepSeek chat completions
- Hugging Face Transformers embeddings for local-memory retrieval
- Zod validation
- Vitest and ESLint

## Getting Started

Install dependencies:

```bash
npm install
```

Create `.env.local` with the values needed for the surfaces you plan to use:

```bash
MONGODB_URI=
NOTION_API_KEY=
NOTION_DATABASE_ID_PROJECTS=
NOTION_DATABASE_ID_TASKS=
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=
DEEPSEEK_PRO_MODEL=
DEEPSEEK_CODING_MODEL=
```

Optional local-memory overrides:

```bash
LOCAL_MEMORY_DIR=local-memory
LOCAL_MEMORY_VECTOR_STORE_DIR=data/local-memory-vector-store
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Local Memory RAG

Private chat grounding lives in `local-memory/`. Add concise Markdown briefs under indexed folders such as `projects/`, `contracts/`, `personal-notes/`, or `technologies/`, then rebuild the vector index:

```bash
npm run rag:check
npm run rag:ingest
```

The generated index is written to `data/local-memory-vector-store/index.json` and is ignored by Git.

## Useful Scripts

```bash
npm run dev        # Start the local Next.js app
npm run build      # Create a production build
npm run start      # Run the production server
npm run lint       # Run ESLint
npm run typecheck  # Run TypeScript checks
npm run test       # Run Vitest tests
npm run rag:check  # Validate local-memory content
npm run rag:ingest # Build the local-memory vector index
npm run rag:eval   # Evaluate local-memory retrieval
```

## Project Structure

```text
src/app/                 App Router pages, route handlers, and server actions
src/app/projects/        Project dashboard, detail page, forms, and actions
src/app/tasks/           Task dashboard, detail page, forms, and actions
src/app/agents/          Multi-agent planning chat and action cards
src/app/chat/            General local-memory-aware chat surface
src/dal/                 Server-side data access for Mongo-backed entities
src/lib/agents/          Chat, clarifier, orchestrator, and RAG logic
src/lib/db/              Mongoose connection and models
src/lib/email/           Server-only Gmail REST normalization helpers
src/lib/notion/          Notion client, database, and page helpers
local-memory/            Private Markdown knowledge base for RAG
scripts/                 Local-memory ingestion, validation, and eval scripts
```

## Notes

- This project is private-first and expects real API credentials in local environment variables.
- AI-generated work suggestions are reviewed through UI action cards before they are applied.
- The Gmail layer currently provides reusable server-side querying utilities; UI coverage can be built on top of `src/lib/email`.
