# VoicePilot — Talk to Your Project

VoicePilot is a voice-first AI engineering copilot built for ArchScale AS-03. Instead of navigating a project dashboard, a developer asks natural-language questions about project health, architecture, recent activity and risks.

## AS-03 workflow
- **Speech-to-text:** browser Web Speech API turns spoken requests into text.
- **Intent understanding:** the backend classifies requests into project snapshot, health report, recent activity and recommendation intents.
- **Entity extraction:** domain entities such as API, database, security and dependencies are extracted.
- **Command execution:** requests invoke bounded backend operations backed by PostgreSQL.
- **Grounded answers:** the AI receives current project context and is instructed not to invent facts.

## Architecture
`Browser voice/chat → Express API → intent/entity layer → PostgreSQL context → OpenAI (optional) → grounded response → speech`

The app works without an OpenAI key using a deterministic, database-grounded fallback. Add `OPENAI_API_KEY` for model-powered responses.

## Run locally
1. Install Node 20+ and PostgreSQL.
2. Enable UUIDs: `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
3. Copy `.env.example` to `.env` and set `DATABASE_URL`.
4. Run `npm ci`.
5. Run `psql "$DATABASE_URL" -f schema.sql`.
6. Run `npm run dev`.
7. Open `http://localhost:10000`.

## Production
Build with `npm run build`, then start with `npm start`. The included `render.yaml` provisions a Node web service and PostgreSQL database. Configure `OPENAI_API_KEY` in the deployment environment for the full AI experience.

## Demo script
1. Click **Hold to speak** and ask: “Is my project healthy?”
2. Ask: “What changed recently?”
3. Ask: “Explain the architecture.”
4. Ask: “What should I fix next?”
5. Run the health scan and show the activity timeline.
6. Explain that typed and spoken commands share the same intent/entity pipeline.

## Security
The public demo exposes read-only project intelligence plus a bounded health scan. Inputs are validated and bounded with Zod, Helmet is enabled, SQL is parameterized, and secrets are environment variables only.