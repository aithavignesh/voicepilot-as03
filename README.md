# VoicePilot — Talk to Your Project

VoicePilot is a voice-first AI engineering copilot built for ArchScale AS-03. Instead of navigating a project dashboard, a developer asks natural-language questions about project health, architecture, recent activity and risks.

## Live demo
- Render: https://voicepilot-as03-live.onrender.com
- GitHub: https://github.com/aithavignesh/voicepilot-as03

## AS-03 workflow
- **Speech-to-text:** browser Web Speech API turns spoken requests into text.
- **Intent understanding:** the backend classifies requests into project snapshot, health report, recent activity and recommendation intents.
- **Entity extraction:** domain entities such as API, database, security and dependencies are extracted.
- **Command execution:** requests invoke bounded backend operations such as project inspection and health scanning.
- **Grounded answers:** the AI receives current project context and is instructed not to invent facts.

## Architecture
`Browser voice/chat → Express API → intent/entity layer → project context → OpenAI (optional) → grounded response → speech`

The deployed demo is intentionally safe: it works without an OpenAI key and without a database connection by using deterministic demo project context. When `DATABASE_URL` is configured, the service can establish a PostgreSQL connection; the included `schema.sql` defines the persistence model for projects, files, events, health checks, conversations and messages.

## Run locally
1. Install Node 20+ and PostgreSQL.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` if you want PostgreSQL connectivity.
3. Run `npm install`.
4. If using PostgreSQL, apply the schema: `psql "$DATABASE_URL" -f schema.sql`.
5. Run `npm run dev`.
6. Open `http://localhost:10000`.

## Production
Build with `npm run build`, then start with `npm start`. The included `render.yaml` describes a Node web service plus PostgreSQL database. The currently live Render service is configured as a safe demo deployment; add `OPENAI_API_KEY` for model-powered responses and `DATABASE_URL` for a real PostgreSQL-backed deployment.

## Demo script
1. Click **Hold to speak** and ask: “Is my project healthy?”
2. Ask: “What changed recently?”
3. Ask: “Explain the architecture.”
4. Ask: “What should I fix next?”
5. Run the health scan and show the activity timeline.
6. Explain that typed and spoken commands share the same intent/entity pipeline.
7. Point out that the same backend can use OpenAI and PostgreSQL when those environment variables are configured.

## Security
The public demo exposes read-only project intelligence plus a bounded health scan. Inputs are validated and bounded with Zod, Helmet is enabled, SQL is parameterized where database queries are used, and secrets are environment variables only.

## Verification
GitHub Actions runs `npm install`, `npm run typecheck`, and `npm run build` on pushes and pull requests to `main`.
