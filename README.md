# Social Command Center

A Telegram bot that **makes social media posts for you every day** — image + caption — so you can
post them yourself. No Instagram API, no S3, no platform approvals needed.

**Recommended workflow:** Bot DMs you a fresh post each morning → save the image → copy the caption →
post to Instagram/TikTok/etc. manually. Takes 30 seconds.

Auto-posting to social platforms is optional and much harder to set up.

---

## Run it in 5 minutes (daily posts)

### 1. Create the bot

Open Telegram → message **@BotFather** → `/newbot` → copy the token.

### 2. Get your user id

Message **@userinfobot** → copy your numeric id.

### 3. Get a free AI key

Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → create a free Gemini key.

### 4. Configure

```bash
cp .env.example .env
```

Fill in `.env`:

```
TELEGRAM_BOT_TOKEN=<from BotFather>
TELEGRAM_OWNER_IDS=<your numeric id>
GEMINI_API_KEY=<free key from Google>
DAILY_POST_PROMPT=Posts for my coffee shop downtown — specialty drinks, cozy vibe, local community
DAILY_POST_HOUR=9
DAILY_POST_TIMEZONE=America/New_York
```

### 5. Run

```bash
npm install
npm run preflight
npm run dev
```

### 6. Use it

Message your bot `/daily` to get a post right now. Every day at your set hour, the bot will DM you
automatically.

1. **Save the image** (long-press → save)
2. **Copy the caption** from the next message
3. **Post** to Instagram, TikTok, etc. yourself

Tap 🔄 Regenerate if you want a different version.

---

## Commands

| Command | Does |
|---|---|
| `/daily` | Get today's post now (image + caption) |
| `/generate <prompt>` | Custom post on demand |
| `/start` | Help |
| `/status` | What's configured |
| `/cancel` | Discard a draft in progress |

---

## Optional: auto-posting to socials

This is **much harder** (Instagram API, Meta app approval, public media hosting). Most people
should stick with the daily manual workflow above.

Send a video or photo to start an approval-card draft for auto-posting. See below for platform setup.

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

## Troubleshooting

| Symptom | Fix |
|---|---|
| Bot never replies | Set `TELEGRAM_OWNER_IDS` to **your user id** from @userinfobot (not a chat/channel id). The bot only responds to listed owners. |
| Posts say "DRY RUN" | `DRY_RUN=true` in `.env` — set to `false` for live posting. |
| Instagram upload fails | Configure `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `MEDIA_PUBLIC_BASE_URL`. Instagram needs a public HTTPS URL for your media. |
| No platforms to post to | Send a photo/video, toggle platforms on the approval card, add a caption, tap ✅ Post now. |

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
