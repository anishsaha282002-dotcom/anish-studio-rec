# Southpark Construction — Lead Capture Demo Setup

## Demo priorities (build order)

1. Vapi assistant branding + system prompt
2. Inbound call + structured end-of-call output
3. Vapi webhook → intake server or n8n
4. Owner SMS alert (Twilio)
5. Airtable lead record
6. Salesperson SMS + customer confirmation
7. Follow-up reminders + calendar (optional)

Items **1–5** are enough for a client-facing demo.

---

## 1. Configure environment

```bash
cd southpark-demo
cp .env.example .env
# Fill in Vapi, Twilio, Airtable, OWNER_PHONE, SALES_REP_PHONE
npm install
```

For the first live demo, set `OWNER_PHONE` and `SALES_REP_PHONE` to **your own test numbers**.

---

## 2. Generate Vapi assets

```bash
npm run generate:prompt      # docs/vapi-system-prompt.md
npm run generate:assistant   # config/vapi-assistant.payload.json
```

### Create / update Vapi assistant

```bash
curl -X POST https://api.vapi.ai/assistant \
  -H "Authorization: Bearer $VAPI_API_KEY" \
  -H "Content-Type: application/json" \
  -d @config/vapi-assistant.payload.json
```

Assign the assistant to your demo phone number in the Vapi dashboard (**Phone Numbers → Inbound → Assistant**).

---

## 3. Webhook options

### Option A — Built-in Node server (fastest for demo)

```bash
npm run dev
# Expose with ngrok: ngrok http 8787
# Set Vapi server URL to: https://YOUR-NGROK.ngrok.io/webhooks/vapi/end-of-call
```

### Option B — n8n (production-style)

Import `n8n/workflow-vapi-intake.json` into n8n.

Set n8n environment variables matching `.env.example`.

Point Vapi **server URL** to the n8n webhook URL.

The n8n workflow uses Code nodes that mirror `src/scoring/lead-scoring.ts` logic.

---

## 4. Airtable

Follow `airtable/schema.md` to create the Leads table.

Set:

```env
AIRTABLE_API_KEY=pat...
AIRTABLE_BASE_ID=app...
AIRTABLE_LEADS_TABLE=Leads
```

---

## 5. Twilio SMS

Register an A2P 10DLC campaign before production customer SMS.

For demo/testing:

```env
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_SMS_NUMBER=+1...
OWNER_PHONE=+1YOUR_TEST_NUMBER
SALES_REP_PHONE=+1YOUR_TEST_NUMBER
```

---

## 6. Demo test call

Use **fictional** caller details.

**Say:**

> "I need a commercial renovation estimate in Abilene. The project is a restaurant remodel. My budget is around $50,000 and I want to begin within 30 days."

**Expected:**

| Check | Expected |
|-------|----------|
| Caller type | New Lead |
| Lead status | Qualified |
| Airtable | Record created |
| Owner SMS | Sent |
| Sales SMS | Sent (if enabled) |
| Customer SMS | Sent (if enabled + phone captured) |

Run unit tests:

```bash
npm test
```

---

## 7. Reuse for other contractors

Change only config — no code changes required:

```env
BUSINESS_NAME=Another Contractor LLC
ASSISTANT_NAME=Project Intake Assistant
SERVICE_AREAS=Dallas,Houston,Austin
ACCEPTED_SERVICES=...
MINIMUM_BUDGET=15000
```

Or edit `config/default.config.json`.

---

## Safety rules (enforced in prompt + scoring)

The AI must **never**:

- Quote pricing or approve jobs
- Give legal, permitting, engineering, or safety advice
- Promise schedules or appointments without calendar integration

Urgent/emergency calls instruct callers in immediate danger to **call 911**.
