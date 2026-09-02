# Vapi Deployment — Southpark Demo

**Demo line:** +1 (682) 727-3062  
**Assistant:** Southpark Project Intake Assistant (`d9e37613-ed22-47c7-bae3-1a104a246954`)

## Simple flow (what happens after a call)

1. AI answers, qualifies the lead, collects project details
2. **Text → the phone number that called in** (Imran grills from his cell → gets SMS on his cell)
3. **Email → info.spam@gmail.com**

## Wire it up (2 steps)

### Step 1 — Deploy webhook (pick one)

**Option A — Google Apps Script (easiest; email works without Resend)**

See `docs/SIMPLE_DEMO_SETUP.md` — paste `apps-script/vapi-intake-webhook.gs`, deploy as web app, copy `/exec` URL.

**Option B — Vercel**

Deploy `southpark-demo` to Vercel. Set env: `OWNER_EMAIL=info.spam@gmail.com`, `TWILIO_*`, `RESEND_API_KEY`.

Webhook path: `/webhooks/vapi/end-of-call`

### Step 2 — Point Vapi at the webhook

```bash
cd southpark-demo
VAPI_API_KEY=your-key \
WEBHOOK_URL="https://script.google.com/macros/s/YOUR_ID/exec" \
npm run wire:vapi
```

This replaces the old Make.com webhook (`hook.us2.make.com/...` — queue was full / broken).

## Test script

> "I need a commercial renovation estimate in Abilene — restaurant build-out, fifty thousand dollar budget, within thirty days. My name is Imran Test."

Hang up → SMS to your cell + email to **info.spam@gmail.com**.

## IDs

| Item | Value |
|------|-------|
| Phone ID | `e30a70c5-1db3-43ab-8434-55367feb332f` |
| Assistant ID | `d9e37613-ed22-47c7-bae3-1a104a246954` |

**Do not commit VAPI_API_KEY to git.**
