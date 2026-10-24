# The coach: steps 1–5 as a conversation

A web app that runs the first five steps of the v2 workshop (problems → workarounds → jobs → features, then Ground Zero argued down) as a consultative, Socratic conversation. Founders need only a browser and the link: **https://roadmap.zero2one.ee**

- `coach.ts`: the method (system prompt), the tools Claude records the wall with, and the gates between steps. Pure; `npm test` runs `coach.spec.ts`.
- `auth.ts`: accounts by emailed code (see below). Pure plus files; `auth.spec.ts`.
- `server.ts`: one Node process, no framework. It streams each reply, applies tool calls, stores each conversation as JSON, and enforces the limits.
- `public/kiosk.js`, `public/kiosk.css`: the kiosk kit, vendored from `~/Code/kiosk-pattern` (see its PATTERN.md); copy them again when the kit changes. `server.ts` serves them beside the page.
- `public/index.html`: only what the coach says and means, on the kit; the kit gives it the Gist kiosk's face (`~/Code/macmail/kiosk`): one full screen, one exchange at a time. The founder sees only the prompt; Enter plays the send (streaks gather into a message that becomes a ball), three balls bounce while the coach thinks, and the reply lands with a flash, its lines condensing in one by one. A quiet status line says the step and what has been noted; `/wall` lists it; ↑ walks back through earlier exchanges; `/new` starts a new conversation (mid-way, one screen asks first; the old one stays with the facilitator). At the end it asks name, email, the code we email to it, and consent, one screen each (logged in, only what isn't known yet), then plays the founder's roadmap back as a tour (`k.tour`): their product, problems, workarounds, jobs and features, then their flight plan, release by release from Ground Zero. Enter goes on and ↑ goes back. Enter on the tour's last screen opens the founder's roadmap website, rising over the kiosk: the plugin coach's whiteboard page in v2 words (`web/roadmap.ts` and `web/roadmap.template.html`, served at `/roadmap/<conversation id>`, with its libraries from `assets/vendor` as one gzipped, cached `/roadmap-vendor.js`). It runs the 3D flight path, the trace (each problem → workarounds → the jobs in them), the wall (jobs and features), the stories sized per release, "would they pay for it?", the flight plan as the flipchart, Ground Zero's stories, unknowns, the brief, build day, and the conversation; Escape or "back to the flow" returns to the tour's last screen, and "open as its own page" keeps it in a tab. Enter after the end walks it again, and `/roadmap` opens the report website straight away. Commands are offered only while they can do something: `/wall` once something is noted, `/trash` once something is in it (or when logged in), `/conversations` and `/logout` when logged in, `/login` when not, `/new` once the conversation has started, `/roadmap` once the email is in and the flight plan is cut.

## Accounts, and nothing deleted

- **Logging in is by a code, never a password.** `/login` asks for an email and sends a six-digit code from `noreply@zero2one.ee` (`CODE_FROM`). It works once, for 15 minutes and 5 tries, at most 3 codes an email and 20 an IP an hour, and is kept only as a hash in `data/codes/`. Nobody has to log in to start: a founder who doesn't is asked for the code at the end, and that makes their account (`data/accounts/<id>.json`, the id coming from the email).
- **Staying logged in:** an `httpOnly` cookie, `coach_auth`, for a year, rolled forward as it is used; the server keeps only its hash (`data/logins/`). `/logout` ends it.
- **Conversations belong to the account.** Proving an email claims the conversation open in that browser (if anything was said in it) and any finished earlier with that email. `/conversations` lists them, Enter opens one, `t` trashes one. A conversation with an account answers only to its login; `/roadmap/<id>` and `/stop/<id>` stay open, because the emails link them.
- **Nothing on the wall is deleted.** `t` on a lit item in `/wall` sends it to the trash with what hangs off it (a problem's workarounds, a job's features); `/trash` brings it back with exactly what went with it. The coach's `remove` tool does the same. The coach hears about the founder's own changes on their next turn; if one opens an earlier step again, the conversation steps back to it, and a flight plan already cut is cut again (the one before is kept beside it). Trashed conversations stay on disk and on the admin page, and can't be carried on until they are brought back.

## Ground Zero, argued down (step 5)

After the features, the founder decides what gets built and sold first. They pick one job (`choose_job`); the coach steers toward one drawn from a workaround the customer already pays for. Then it says, out loud, "I'm now the visiting table", and argues each feature of that job, one per turn: could they still get the job done, and still pay, without it? It pushes back once on a keep that sounds like habit; the founder has the last word, and `decide` records keep or later with their reason. Then they name the month it could be in someone's hands (`set_month`). The step is done when every feature of the job is argued, at least one is kept, and the month is set. Features of other jobs go to later releases. The status line counts kept, later and still to argue; `/wall`, the tour at the end and the roadmap website (*Argue it down*) show the decisions with the reasons, and the intake carries them as `argued` for the report run. Trashing Ground Zero's job opens the step again.

Done is step 6. Conversations from before this step moved their end there when they're loaded.

## The flight plan at the end

As a founder reaches the end, the server cuts a first flight plan from their wall: one more model call (`CUT_SYSTEM` in `coach.ts`, with a JSON schema) writes the stories for each feature and cuts them into releases, taking Ground Zero as the founder argued it (their job, their month, exactly the features they kept), and `web/report.ts`'s `check()` and `fromCut` hold it to the release rules and to those decisions, with one retry if it breaks one. It is saved in `data/plans/<id>.json`, added to the founder's intake as `plan`, and shown to them on screen. If it isn't ready when they leave their email, the thinking holds for up to two minutes; past that, or if it fails, they see their roadmap without it, and the plan shows up on their next visit if it lands. The emailed report is still the facilitator's run, starting from this plan.

## Email

The coach sends its own email through the `smtp` container's relay (Postfix at `10.14.235.25:25`, which relays through iCloud for `db@zero2one.ee`, signed with DKIM). `mail.ts` holds the series and how each email is put together; `server.ts` checks every ten minutes, and straight away when a founder leaves their email or their flight plan lands.

- **To the facilitator** (`FACILITATOR_EMAIL`): one note per finished conversation, with who, what, whether they said yes, and their roadmap link.
- **To founders who said yes:** the four emails in `docs/emails`. Email 01 goes as soon as the flight plan is cut and links their roadmap website; 02, 03 and 04 follow 3, 4 and 4 days after the one before. Each one ends with a link (`/stop/<id>`) that stops the rest.
- Only conversations finished after email was switched on (`data/mail/since`) get any, so nobody from before is surprised. What each founder has been sent is in `data/mail/<id>.json` and on the admin page.
- Settings in `/etc/roadmap-coach.env`: `SMTP_HOST` (no host, no email), `SMTP_PORT`, `FACILITATOR_EMAIL`, and optionally `FACILITATOR` (the name the emails are signed with, default Delaney), `MAIL_FROM`, `PUBLIC_URL`, `COACH_NAME` (what the page calls the coach, default Roadmap First), `BOOKING_LINK` (without it, email 04 asks them to reply to book time).
- The relay accepts `db@zero2one.ee` and `noreply@zero2one.ee` as senders: the series comes from `db@`, so replies come back there; login codes come from `noreply@`.

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

A second coach, `igniter-coach` (igniter.zero2one.ee, `/etc/caddy/igniter-coach.caddy`), began as a copy of this container with empty data, its own `PUBLIC_URL` and `ADMIN_KEY`. Until it diverges, `app/deploy.sh` ships the same code to both; `COACH_TARGETS=roadmap-coach app/deploy.sh` ships to one. When igniter goes its own way, take it out of the script's default list.
