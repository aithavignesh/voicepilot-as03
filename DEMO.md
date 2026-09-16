# VoicePilot — 3-Minute AS-03 Demo

## 0:00 — The problem
"Developers already have project dashboards, but dashboards make simple questions expensive. VoicePilot lets you talk to the project instead."

## 0:20 — Voice interaction
Click **Hold to speak** and say:
- "Is my project healthy?"
- "What changed recently?"
- "Explain the architecture."

Show that speech becomes text, the backend classifies the intent, and the answer is spoken back.

## 1:10 — Grounded project intelligence
Show:
- Health score and individual checks
- Risk Radar
- Recommended Next
- Recent GitHub activity
- Files to Watch

Emphasize that answers are grounded in project context rather than generic chatbot responses.

## 1:50 — Multi-project workflow
Use **Connect GitHub** with a public repository and switch the active project. Then ask:

> "What is the architecture of this project?"

This demonstrates that the voice layer operates on the selected project context.

## 2:25 — Safe action
Say:

> "Replace OLD with NEW in README.md"

Show the preview. Explain that VoicePilot verifies exactly one match and requires explicit confirmation before committing to GitHub.

## 2:45 — Closing
"VoicePilot is not just speech-to-text. It is a voice command layer for project software: speech → intent → entities → project context → grounded answer or safe action → confirmation → execution → speech."

## Judge checklist
- Voice input / speech-to-text
- Natural-language intent understanding
- Entity extraction
- Project context and retrieval
- At least one real project action
- Confirmation before a write action
- Voice/text response
- GitHub integration
- Responsive dashboard
- Deterministic fallback when optional AI credentials are unavailable
