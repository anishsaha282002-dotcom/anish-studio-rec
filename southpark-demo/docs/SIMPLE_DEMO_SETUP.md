# Southpark demo — email only (no SMS cost)

**Goal:** Call **+1 (682) 727-3062** → AI qualifies lead → **email to info.spam@gmail.com**.

No Twilio, no paid SMS — use Google Apps Script + Gmail (free).

## Setup (5 min)

1. Open [script.google.com](https://script.google.com) → **New project**
2. Paste `apps-script/vapi-intake-webhook.gs`
3. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the **`/exec`** URL
5. Wire Vapi:

```bash
cd southpark-demo
VAPI_API_KEY=your-key WEBHOOK_URL="https://script.google.com/macros/s/.../exec" npm run wire:vapi
```

## Test script

> "I need a commercial renovation estimate in Abilene — restaurant build-out, fifty thousand dollar budget, within thirty days. My name is Imran Test."

Hang up → check **info.spam@gmail.com**.

## Vapi IDs

| Item | Value |
|------|-------|
| Phone | +1 (682) 727-3062 |
| Phone ID | `e30a70c5-1db3-43ab-8434-55367feb332f` |
| Assistant ID | `d9e37613-ed22-47c7-bae3-1a104a246954` |

SMS can be added after contract signing.
