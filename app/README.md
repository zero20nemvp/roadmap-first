# The coach: steps 1–4 as a conversation

A web app that runs the first four steps of the v2 workshop (problems → workarounds → jobs → features) as a consultative, Socratic conversation. Founders need only a browser and the link: **https://roadmap.hetzner.zero2one.ee**

- `coach.ts`: the method (system prompt), the tools Claude records the wall with, and the gates between steps. Pure; `npm test` runs `coach.spec.ts`.
- `server.ts`: one Node process, no framework. It streams each reply, applies tool calls, stores each conversation as JSON, and enforces the limits.
- `public/kiosk.js`, `public/kiosk.css`: the kiosk kit, vendored from `~/Code/kiosk-pattern` (see its PATTERN.md); copy them again when the kit changes. `server.ts` serves them beside the page.
- `public/index.html`: only what the coach says and means, on the kit; the kit gives it the Gist kiosk's face (`~/Code/macmail/kiosk`): one full screen, one exchange at a time. The founder sees only the prompt; Enter plays the send (streaks gather into a message that becomes a ball), three balls bounce while the coach thinks, and the reply lands with a flash, its lines condensing in one by one. A quiet status line says the step and what has been noted; `/wall` lists it; ↑ walks back through earlier exchanges; `/new` starts a new conversation (mid-way, one screen asks first; the old one stays with the facilitator). At the end it asks name, email and consent, one screen each, then plays the founder's roadmap back as a tour (`k.tour`): their product, problems, workarounds, jobs and features, then their flight plan, release by release from Ground Zero. Enter goes on and ↑ goes back. Enter on the tour's last screen opens the founder's roadmap website, rising over the kiosk: the plugin coach's whiteboard page in v2 words (`web/roadmap.ts` and `web/roadmap.template.html`, served at `/roadmap/<conversation id>`, with its libraries from `assets/vendor` as one gzipped, cached `/roadmap-vendor.js`). It runs the 3D flight path, the trace (each problem → workarounds → the jobs in them), the wall (jobs and features), the stories sized per release, "would they pay for it?", the flight plan as the flipchart, Ground Zero's stories, unknowns, the brief, build day, and the conversation; Escape or "back to the flow" returns to the tour's last screen, and "open as its own page" keeps it in a tab. Enter after the end walks it again, and `/roadmap` opens the report website straight away. Commands are offered only while they can do something: `/wall` once something is noted, `/new` once the conversation has started, `/roadmap` once the email is in and the flight plan is cut.

## The flight plan at the end

As a founder reaches step 5, the server cuts a first flight plan from their wall: one more model call (`CUT_SYSTEM` in `coach.ts`, with a JSON schema) writes the stories for each feature and cuts them into releases, and `web/report.ts`'s `check()` holds it to the release rules, with one retry if it breaks one. It is saved in `data/plans/<id>.json`, added to the founder's intake as `plan`, and shown to them on screen. If it isn't ready when they leave their email, the thinking holds for up to two minutes; past that, or if it fails, they see their roadmap without it, and the plan shows up on their next visit if it lands. The emailed report is still the facilitator's run, starting from this plan.

## Email

The coach sends its own email through the `smtp` container's relay (Postfix at `10.14.235.25:25`, which relays through iCloud for `db@zero2one.ee`, signed with DKIM). `mail.ts` holds the series and how each email is put together; `server.ts` checks every ten minutes, and straight away when a founder leaves their email or their flight plan lands.

- **To the facilitator** (`FACILITATOR_EMAIL`): one note per finished conversation, with who, what, whether they said yes, and their roadmap link.
- **To founders who said yes:** the four emails in `docs/emails`. Email 01 goes as soon as the flight plan is cut and links their roadmap website; 02, 03 and 04 follow 3, 4 and 4 days after the one before. Each one ends with a link (`/stop/<id>`) that stops the rest.
- Only conversations finished after email was switched on (`data/mail/since`) get any, so nobody from before is surprised. What each founder has been sent is in `data/mail/<id>.json` and on the admin page.
- Settings in `/etc/roadmap-coach.env`: `SMTP_HOST` (no host, no email), `SMTP_PORT`, `FACILITATOR_EMAIL`, and optionally `FACILITATOR` (the name the emails are signed with, default Delaney), `MAIL_FROM`, `PUBLIC_URL`, `BOOKING_LINK` (without it, email 04 asks them to reply to book time).
- The relay only accepts `db@zero2one.ee` as the sender, so the emails come from there, and replies come back there.

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
- **Code:** `/opt/roadmap-coach/{app,web}`. Data: `/var/lib/roadmap-coach/data/{sessions,intakes,plans,mail,usage}`.
- **Service:** `systemctl status roadmap-coach`; logs with `journalctl -u roadmap-coach`.
- **Settings:** `/etc/roadmap-coach.env` (mode 600): `ANTHROPIC_API_KEY`, `ADMIN_KEY`, `DAILY_USD`, `DATA_DIR`, `PORT`, and the email settings above.
- **Proxy:** the host's Caddy, `/etc/caddy/roadmap-coach.caddy` (imported from the Caddyfile), with `flush_interval -1` so replies stream.

Ship a change with `app/deploy.sh` from the repo root.
