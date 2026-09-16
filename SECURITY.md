# Security Notes

VoicePilot is designed as a hackathon prototype with a deliberately bounded action surface.

- Secrets belong in server-side environment variables, never browser code or committed files.
- `GITHUB_TOKEN` is only used by the backend for repository writes.
- Public repository reads can work without a GitHub token.
- Request bodies are bounded and validated with Zod.
- Helmet provides baseline HTTP security headers.
- Repository modification is limited to approved text files and exact single-match replacements.
- A preview is generated before a write and explicit confirmation is required to commit.
- PostgreSQL queries use parameterized statements through the `pg` client.

For a production deployment, replace personal access tokens with GitHub App/OAuth credentials, add authenticated multi-user authorization, use branch/PR workflows for writes, and apply stricter rate limiting and audit logging.
