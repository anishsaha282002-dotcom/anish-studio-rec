# Vapi Deployment — Southpark Demo (live)

**Deployed:** 2026-09-02

| Item | Value |
|------|-------|
| **Demo phone** | +1 (682) 727-3062 |
| **Phone ID** | `e30a70c5-1db3-43ab-8434-55367feb332f` |
| **Assistant** | Southpark Project Intake Assistant |
| **Assistant ID** | `d9e37613-ed22-47c7-bae3-1a104a246954` |
| **End-of-call webhook** | Make.com (existing) — verify scenario sends SMS to Imran |

## Test call script

> "I need a commercial renovation estimate in Abilene — restaurant build-out, fifty thousand dollar budget, within thirty days. My name is Imran Test, phone 817-555-0100, email test@example.com."

## Before Imran calls

- [ ] Confirm Make.com scenario texts **Imran's mobile** on end-of-call
- [ ] Or set `OWNER_PHONE` in Make to Imran's cell
- [ ] Test call yourself once

## Revert to another assistant

```bash
# Jamaican Cook Shop: 8fa14657-0e4a-48ef-a5e4-39da2fd59312
curl -X PATCH "https://api.vapi.ai/phone-number/e30a70c5-1db3-43ab-8434-55367feb332f" \
  -H "Authorization: Bearer $VAPI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"assistantId": "8fa14657-0e4a-48ef-a5e4-39da2fd59312"}'
```

**Do not commit VAPI_API_KEY to git.**
