# Southpark Construction — AI Lead Capture Demo

Live inbound AI phone receptionist demo for construction / renovation / tenant-improvement lead capture.

**Business outcome:** When a potential customer calls, the AI answers immediately, qualifies the lead, and sends a structured SMS summary to the owner and salesperson.

## Stack

| Component | Role |
|-----------|------|
| **Vapi** | Inbound AI voice agent, transcripts, structured end-of-call report |
| **Twilio** | Demo phone number + SMS alerts |
| **n8n** | Webhook automation (optional — built-in Node server included) |
| **Airtable** | Lead dashboard |
| **This repo** | Config, scoring rules, SMS templates, Vapi prompt |

## Quick start

```bash
cd southpark-demo
cp .env.example .env
npm install
npm test
npm run generate:assistant
npm run dev
```

Full setup: [docs/SETUP.md](docs/SETUP.md)

## Project layout

```
southpark-demo/
  config/           # default.config.json, vapi-assistant.payload.json
  src/
    config.ts       # Env + JSON config loader
    scoring/        # Deterministic lead scoring rules
    sms/            # SMS templates
    vapi/           # System prompt + assistant payload
    webhook/        # Vapi payload parser
    pipeline/       # Intake orchestration
    integrations/   # Airtable + Twilio
    server.ts       # Webhook server for demo
  n8n/              # Importable n8n workflow
  airtable/         # Leads table schema
  docs/             # Setup + generated Vapi prompt
```

## Configurable branding

All client-specific values come from `.env` or `config/default.config.json`:

- `BUSINESS_NAME=Southpark Construction`
- `ASSISTANT_NAME=Southpark Project Intake Assistant`
- Service areas, accepted services, minimum budget
- Owner/sales phones for SMS routing

## Demo test script

Call the demo number and say:

> "I need a commercial renovation estimate in Abilene. The project is a restaurant remodel. My budget is around $50,000 and I want to begin within 30 days."

Expected: **Qualified** lead → Airtable record → owner + sales SMS.

## Safety constraints

The AI must never quote pricing, approve work, or give legal/engineering/permitting/safety advice. Emergency callers are instructed to call **911**.

## Reuse for other contractors

Change config only — no logic rewrites required.
