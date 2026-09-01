# Social Command Center

A Telegram bot that is your control surface for publishing content. Send it a video, it shows you
an approval card, you tap a button, it posts.

**Nothing publishes without your tap.** A scheduled post is a *deferred approved* post — you
approved it, the queue just released it later. There is no autonomous posting path.

---

## Run it in 5 minutes

You do not need any platform approvals to see this working. It runs in dry-run mode out of the
box: the full pipeline executes, validation is real, publishing is simulated.

### 1. Create the bot

Open Telegram → message **@BotFather** → `/newbot` → pick a name, then a username ending in `bot`.
Copy the token it gives you.

### 2. Get your user id

Message **@userinfobot**. It replies with your numeric id.

### 3. Configure

```bash
cp .env.example .env
```

Open `.env` and fill in exactly two things:

```
TELEGRAM_BOT_TOKEN=<the token from BotFather>
TELEGRAM_OWNER_IDS=<your numeric id>
```

Leave everything else blank. Leave `DRY_RUN=true`.

### 4. Run

```bash
npm install
npm run preflight   # sanity check — shows what is connected
npm run dev
```

### 5. Use it

Message your bot: send it a video. It replies with an approval card showing the video, the
caption, per-platform validation, and buttons. Tap platform toggles, tap ✏️ Caption to set the
text, tap ✅ Post now. In dry run it logs what it *would* post.

---

## Commands

| Command | Does |
|---|---|
| `/start` | Help |
| `/status` | Dry-run or live, which platforms are connected, counts |
| `/queue` | Scheduled posts, each cancellable |
| `/cancel` | Discard the draft in progress |

Send a video or photo to start a draft. Everything else is buttons.

---

## What is and isn't built

**Built and working:** Telegram intake, the approval card with in-place editing, platform toggles,
per-platform validation (duration, file size, aspect ratio, caption length), caption editing,
scheduling, the release queue, SQLite persistence, owner allowlist, secret redaction in logs.

**Stubbed:** four of five `publish()` functions (YouTube, TikTok, LinkedIn, X). Each validates for real and returns a clear "not implemented" result.

**Implemented:** Instagram publisher in `src/publishers/instagram.ts` — container → poll → publish via Graph API. Still requires `MEDIA_PUBLIC_BASE_URL` and Meta app approval before live posting.

That split is deliberate. The plumbing is the tedious part and it is done. Each publisher is now
an isolated task you can hand to Cursor one at a time.

---

## Going live

Do not flip `DRY_RUN=false` until a publisher is actually implemented and you have tested it.

The platform approvals are the long pole and they run in parallel with the code:

- [ ] **Instagram** — convert to a **Business** account (Creator does not work), link a Facebook Page, create the Meta app, submit for review (~2–4 weeks, needs a screencast of the full flow)
- [ ] **TikTok** — create the developer app and **submit for audit**. Until it passes, every post is forced to private view
- [ ] **YouTube** — Google Cloud project, enable YouTube Data API v3, OAuth consent screen in testing mode with your account as a test user. No human review needed — start here
- [ ] **LinkedIn** — needs a Company Page just to register the app, then product approval
- [ ] **X** — check current pricing first. The old free posting tier is closed to new developers

Two infrastructure pieces you will need before Instagram works:

- **Public media hosting.** Instagram fetches video from a public HTTPS URL — it will not accept
  a file upload. Cloudflare R2 or S3 with public read.
- **A public HTTPS callback URL** for the OAuth flows. Cloudflare Tunnel or a small VPS.

---

## Security

- Secrets live in `.env`, which is gitignored. Never commit it, never paste a token into a chat.
- The logger redacts anything matching token/secret/authorization patterns.
- Every update is checked against `TELEGRAM_OWNER_IDS` and silently dropped otherwise. The bot
  refuses to start if that list is empty — a public bot username is discoverable, and strangers
  will find it.
- Platform limits in `registry.ts` were correct when written but **move**. Verify them against the
  official docs before going live.

---

## Layout

```
src/
  config.ts              env parsing, fails loudly and early
  logger.ts              pino + secret redaction
  types.ts               shared types
  store/db.ts            SQLite: drafts, posts
  publishers/
    types.ts             Publisher interface + shared validation
    instagram.ts         Instagram Graph API publisher (implemented)
    registry.ts          platform registry + stubs for remaining platforms
  bot/
    card.ts              approval card rendering, MarkdownV2 escaping
    index.ts             handlers, commands, buttons
  queue/scheduler.ts     releases scheduled posts
  preflight.ts           connection check
```
