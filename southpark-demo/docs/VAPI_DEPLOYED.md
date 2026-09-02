# Vapi Deployment — Southpark Demo

**Demo line:** +1 (682) 727-3062  
**Assistant:** Southpark Project Intake Assistant (`d9e37613-ed22-47c7-bae3-1a104a246954`)

## After each call (email only — no SMS cost)

1. AI answers and qualifies the lead
2. **Email → info.spam@gmail.com** (via Google Apps Script + Gmail, free)

## Wire it up

1. Deploy `apps-script/vapi-intake-webhook.gs` as Google Apps Script web app
2. Run:

```bash
cd southpark-demo
VAPI_API_KEY=your-key \
WEBHOOK_URL="https://script.google.com/macros/s/YOUR_ID/exec" \
npm run wire:vapi
```

See `docs/SIMPLE_DEMO_SETUP.md`.

## Test

> "Commercial renovation in Abilene — restaurant build-out, $50k budget, 30 days. Name Imran Test."

Hang up → check **info.spam@gmail.com**.

**Do not commit VAPI_API_KEY to git.**
