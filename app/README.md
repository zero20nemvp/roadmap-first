# The coach: steps 1–4 as a conversation

A web app that runs the first four steps of the v2 workshop (problems → workarounds → jobs → features) as a consultative, Socratic conversation. Founders need only a browser and the link: **https://roadmap.hetzner.zero2one.ee**

- `coach.ts`: the method (system prompt), the tools Claude records the wall with, and the gates between steps. Pure; `npm test` runs `coach.spec.ts`.
- `server.ts`: one Node process, no framework. It streams each reply, applies tool calls, stores each conversation as JSON, and enforces the limits.
- `public/kiosk.js`, `public/kiosk.css`: the kiosk kit, vendored from `~/Code/kiosk-pattern` (see its PATTERN.md); copy them again when the kit changes. `server.ts` serves them beside the page.
- `public/index.html`: only what the coach says and means, on the kit; the kit gives it the Gist kiosk's face (`~/Code/macmail/kiosk`): one full screen, one exchange at a time. The founder sees only the prompt; Enter plays the send (streaks gather into a message that becomes a ball), three balls bounce while the coach thinks, and the reply lands with a flash, its lines condensing in one by one. A quiet status line says the step and what has been noted; `/wall` lists it; ↑ walks back through earlier exchanges; `/new` starts a new conversation (mid-way, one screen asks first; the old one stays with the facilitator). At the end it asks name, email and consent, one screen each, then plays the founder's roadmap back as a tour (`k.tour`): their product, problems, workarounds, jobs and features, then their flight plan, release by release from Ground Zero. Enter goes on and ↑ goes back. Enter on the tour's last screen opens the whole roadmap as one long page, the report's own HTML (`renderReport`, served at `/roadmap/<conversation id>`), rising over the kiosk; Escape or "back to the flow" returns to the tour's last screen, and "open as its own page" keeps it in a tab. Enter after the end (or `/roadmap`) walks it again.

## The flight plan at the end

As a founder reaches step 5, the server cuts a first flight plan from their wall: one more model call (`CUT_SYSTEM` in `coach.ts`, with a JSON schema) writes the stories for each feature and cuts them into releases, and `web/report.ts`'s `check()` holds it to the release rules, with one retry if it breaks one. It is saved in `data/plans/<id>.json`, added to the founder's intake as `plan`, and shown to them on screen. If it isn't ready when they leave their email, the thinking holds for up to two minutes; past that, or if it fails, they see their roadmap without it, and the plan shows up on their next visit if it lands. The emailed report is still the facilitator's run, starting from this plan.

## Limits (it's free, so it's capped)

| Limit | Value |
|---|---|
| Daily spend across everyone | `DAILY_USD`, default $40; after that the coach says it's resting until tomorrow |
| Founder turns per conversation | 80 |
| Characters per answer | 2,000 |
| New conversations per browser per hour | 6 (the page sends a random id it keeps in the browser) |
| New conversations per IP per hour | 60, so a room on one wifi isn't stopped at the seventh founder |

Cost is estimated from each response's token usage at Claude Opus 5.5 prices. The admin page shows it per conversation and for the day.

## Facilitator

`/admin?key=<ADMIN_KEY>` lists every conversation with its step, turns, cost, transcript, and, once the founder has left an email, the intake to feed the report run (`skills/report`), and the flight plan they were shown.

## Where it runs

- **Container:** `roadmap-coach` on the Hetzner host (`ssh hetzner`), Ubuntu 24.04, Node 24, user `coach`.
- **Code:** `/opt/roadmap-coach/{app,web}`. Data: `/var/lib/roadmap-coach/data/{sessions,intakes,plans,usage}`.
- **Service:** `systemctl status roadmap-coach`; logs with `journalctl -u roadmap-coach`.
- **Settings:** `/etc/roadmap-coach.env` (mode 600): `ANTHROPIC_API_KEY`, `ADMIN_KEY`, `DAILY_USD`, `DATA_DIR`, `PORT`.
- **Proxy:** the host's Caddy, `/etc/caddy/roadmap-coach.caddy` (imported from the Caddyfile), with `flush_interval -1` so replies stream.

Ship a change with `app/deploy.sh` from the repo root.
