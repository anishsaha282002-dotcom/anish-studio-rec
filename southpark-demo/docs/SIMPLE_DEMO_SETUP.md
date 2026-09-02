# Southpark demo — simple setup

**Goal:** Call **+1 (682) 727-3062** → AI qualifies lead → **text goes to your cell** (caller ID) + **email to info.spam@gmail.com**.

## Fastest path (Google Apps Script — email works immediately)

1. Open [script.google.com](https://script.google.com) → **New project**
2. Paste `apps-script/vapi-intake-webhook.gs`
3. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the **`/exec`** URL
5. Wire Vapi (needs your API key):

```bash
cd southpark-demo
VAPI_API_KEY=your-key WEBHOOK_URL="https://script.google.com/macros/s/.../exec" npm run wire:vapi
```

6. **Optional SMS to caller:** In Apps Script → Project Settings → Script properties:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_SMS_FROM` (e.g. `+16827273062`)

## Test script (say this on the call)

> "I need a commercial renovation estimate in Abilene — restaurant build-out, fifty thousand dollar budget, within thirty days. My name is Imran Test."

Hang up → check your phone for SMS + **info.spam@gmail.com** for email.

## Vapi IDs (already deployed)

| Item | Value |
|------|-------|
| Phone | +1 (682) 727-3062 |
| Phone ID | `e30a70c5-1db3-43ab-8434-55367feb332f` |
| Assistant | Southpark Project Intake Assistant |
| Assistant ID | `d9e37613-ed22-47c7-bae3-1a104a246954` |

## Alternative: Vercel webhook

Deploy `southpark-demo` to Vercel, set env vars (`TWILIO_*`, `RESEND_API_KEY`, `OWNER_EMAIL=info.spam@gmail.com`), then run `wire:vapi` with the Vercel URL.
