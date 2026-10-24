# The coach: steps 1–4 as a conversation

A web app that runs the first four steps of the v2 workshop (problems → workarounds → jobs → features) as a consultative, Socratic conversation. Founders need only a browser and the link: **https://roadmap.hetzner.zero2one.ee**

- `coach.ts`: the method (system prompt), the tools Claude records the wall with, and the gates between steps. Pure; `npm test` runs `coach.spec.ts`.
- `server.ts`: one Node process, no framework. It streams each reply, applies tool calls, stores each conversation as JSON, and enforces the limits.
- `public/index.html`: the chat on the left, the wall of post-its on the right, and the contact form at the end.

## Limits (it's free, so it's capped)

| Limit | Value |
|---|---|
| Daily spend across everyone | `DAILY_USD`, default $40; after that the coach says it's resting until tomorrow |
| Founder turns per conversation | 80 |
| Characters per answer | 2,000 |
| New conversations per IP per hour | 6 |

Cost is estimated from each response's token usage at Claude Opus 5.5 prices. The admin page shows it per conversation and for the day.

## Facilitator

`/admin?key=<ADMIN_KEY>` lists every conversation with its step, turns, cost, transcript, and, once the founder has left an email, the intake to feed the report run (`skills/report`).

## Where it runs

- **Container:** `roadmap-coach` on the Hetzner host (`ssh hetzner`), Ubuntu 24.04, Node 24, user `coach`.
- **Code:** `/opt/roadmap-coach/{app,web}`. Data: `/var/lib/roadmap-coach/data/{sessions,intakes,usage}`.
- **Service:** `systemctl status roadmap-coach`; logs with `journalctl -u roadmap-coach`.
- **Settings:** `/etc/roadmap-coach.env` (mode 600): `ANTHROPIC_API_KEY`, `ADMIN_KEY`, `DAILY_USD`, `DATA_DIR`, `PORT`.
- **Proxy:** the host's Caddy, `/etc/caddy/roadmap-coach.caddy` (imported from the Caddyfile), with `flush_interval -1` so replies stream.

Ship a change with `app/deploy.sh` from the repo root.
