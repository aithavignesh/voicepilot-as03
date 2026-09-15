# VoicePilot — Talk to Your Project

VoicePilot is a voice-first AI engineering copilot built for ArchScale AS-03. Instead of navigating a project dashboard, a developer asks natural-language questions about project health, architecture, recent activity and risks.

## Live demo
- Render: https://voicepilot-as03-live.onrender.com
- GitHub: https://github.com/aithavignesh/voicepilot-as03

## AS-03 workflow
- **Speech-to-text:** browser Web Speech API turns spoken requests into text.
- **Intent understanding:** the backend classifies natural-language requests.
- **Entity extraction:** project concepts and file targets are extracted.
- **Project connection:** connect public GitHub repositories and switch the active project from the dashboard.
- **Command execution:** bounded backend operations inspect the selected project and run health scans.
- **Grounded answers:** optional OpenAI responses receive project facts and are instructed not to invent facts.
- **Safe modification:** exact single-match text replacements can be previewed and require explicit confirmation before a GitHub commit.

## Architecture
`Browser voice/chat → Express API → intent/entity layer → active GitHub project context → grounded answer or safe action → confirmation → GitHub commit → speech`

The demo intentionally has a deterministic fallback, so it can operate without an OpenAI key or database. PostgreSQL persistence is supported through `DATABASE_URL`. Public GitHub repository reads do not require a token; repository writes require the server-side `GITHUB_TOKEN`.

## Safe modification scope
Modification is deliberately narrow for the hackathon: exact single-match text replacement in approved text files. VoicePilot fetches the current file, verifies exactly one match, creates a preview, and only writes after explicit confirmation. Tokens are never sent to the browser.

## Run locally
1. Install Node 20+.
2. Copy `.env.example` to `.env`.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open `http://localhost:10000`.

For PostgreSQL persistence, configure `DATABASE_URL` and apply `schema.sql`.

## Demo script
1. Ask: “Is my project healthy?”
2. Ask: “What changed recently?”
3. Ask: “Explain the architecture.”
4. Click **＋ Connect GitHub**, enter another public repository, and switch projects.
5. Ask a question about the newly selected repository.
6. For the write workflow, say: “Replace OLD with NEW in README.md”. Review the preview and explicitly confirm.

## Production roadmap
The next adapter layer can support local projects, GitLab and Bitbucket. A production-grade version can add GitHub App/OAuth authentication, branch/PR workflows, richer code patches, test execution and persistent multi-user project connections.

## Security
Inputs are validated and bounded with Zod, Helmet is enabled, SQL is parameterized, and secrets are server-side environment variables. Repository writes are opt-in and confirmation-gated.

## Verification
The Render build uses `npm install && npm run build`. The source includes typecheck and test scripts for local/CI verification.
