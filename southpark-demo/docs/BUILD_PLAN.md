# Build Plan — Southpark Owner Coordination Demo

*From scratch. Based on research + conversation. No "Casa AI" branding.*

**Seller:** Anish  
**Prospect:** Imran Hajani / Southpark Investments LLC  
**Demo line:** +1 (682) 727-3062  
**Timeline target:** 3–5 days for sales demo (Phase 1)

---

## Product name (pick one with Imran — don't lead with AI)

Options that sound **operational**, not SaaS-y:

- **Southpark Project Coordination Desk**
- **Owner Operations Layer** (your managed service wrapper)
- **Project Intake & Partner Coordination System**

Your deliverable is **managed service + workflow**, not a $399/mo bot.

---

## One-sentence promise

> "We capture every request, route it to the right outsourced partner, chase open items automatically, and give you a clear weekly view of what needs your decision — without hiring another full-time coordinator."

---

## What to build (and what NOT to build)

### Build ✅

| # | Module | Demo proof |
|---|--------|------------|
| 1 | AI front door | Caller identified → correct workflow chosen |
| 2 | Structured intake | Call → structured record (project, party, urgency, action) |
| 3 | Intelligent routing | Tenant / vendor / broker / approval → right bucket |
| 4 | Vendor status chase | Auto-request: milestone, date, blocker, approval needed |
| 5 | Owner escalation | "Decision required" + schedule impact flagged |
| 6 | Weekly executive brief | One-page email: done, blockers, decisions due |
| 7 | Audit trail | Timestamped log of intake → route → follow-up |

### Do NOT build ❌

- Full construction ERP
- Estimating / bidding platform
- Replacement for GC, architect, broker, or legal
- Autonomous approvals or pricing

---

## Stack (lean — what you already use)

| Layer | Tool | Role |
|-------|------|------|
| Voice | **Vapi** (or Retell/Bland) | Inbound answering, transcript, structured summary |
| Phone/SMS | **Twilio** | Demo number 682-727-3062, owner/partner SMS |
| Workflow | **n8n** | Routing, reminders, escalation, weekly brief |
| System of record | **Airtable** | Project board + audit log |
| LLM | GPT/Claude via Vapi | Classification + summary only — **not** approvals |
| Email | Gmail/Outlook | Weekly brief to Imran |

---

## Phase 1 — Sales demo (3–5 days)

**Goal:** Imran can call, grill it, get SMS + see a board record in 5–7 minutes.

### Day 1 — Voice + prompt rewrite

- [ ] Replace current "lead capture for GC" prompt with **coordination desk** prompt
- [ ] Three scenarios:
  - **A:** Contractor/vendor status update
  - **B:** Tenant/broker inquiry
  - **C:** Owner approval request (logged, not approved)
- [ ] Opening line: AI disclosure + "project coordination desk"
- [ ] Assign assistant to **+1 (682) 727-3062**
- [ ] Point Vapi webhook → n8n or `southpark-demo` server

### Day 2 — Data + routing

- [ ] Airtable board per `airtable/schema.md` (coordination fields)
- [ ] Structured output schema: contact type, inquiry type, priority, assigned partner, blocker, decision required
- [ ] n8n Workflow 1: end-of-call → parse → score/route → Airtable create
- [ ] Routing rules:
  - Vendor update → GC/vendor inbox + log
  - Broker/tenant → broker/leasing bucket
  - Approval needed → Imran SMS (test: Anish's phone first)
  - Safety → urgent SMS + 911 script

### Day 3 — Alerts + one simulated chase

- [ ] Owner SMS template (approval required / vendor update / urgent)
- [ ] Simulated vendor chase: n8n sends template SMS/email "reply with milestone, date, blocker"
- [ ] One **pre-loaded example** escalation on Airtable: "Signage change — 3-day impact — decision by Friday"

### Day 4 — Weekly brief + audit

- [ ] n8n scheduled job OR manual trigger: generate weekly brief from Airtable
- [ ] Email to Imran (or Anish test email) with sections:
  - Completed this week
  - Upcoming milestones
  - Blockers / overdue vendors
  - Decisions required
  - Next 7 days
- [ ] Activity log field populated on each intake

### Day 5 — QA + pitch pack

- [ ] Run all 8 grill scenarios (see `OWNER_GRILL_SCRIPT.md` — update for coordination)
- [ ] Record 2-min Loom optional
- [ ] Final pitch email from Anish with demo number
- [ ] 15-min walkthrough script for Imran call

---

## Phase 2 — Paid pilot (10–15 business days after discovery)

Only after Imran says yes + discovery session:

- Map **real** partner groups and approval thresholds
- One live project workflow (likely Abilene TI or next property)
- Production number or call-forward from Imran's line
- 2–3 intake paths: phone + web form + email
- Vendor reminder automation + non-response escalation
- 30-day tuning period
- Staff handoff doc

---

## Code changes needed (from current repo)

Current `southpark-demo` is angled as **GC lead capture**. Refactor to **owner coordination**:

| File | Change |
|------|--------|
| `config/default.config.json` | Remove Casa AI; use coordination desk naming |
| `src/vapi/prompt.ts` | Replace with 3-scenario coordination prompt |
| `src/types/lead.ts` | Add inquiry type, assigned partner, decision required, blocker |
| `src/scoring/lead-scoring.ts` | Route by party type, not sales qualification |
| `src/sms/templates.ts` | Owner escalation + vendor chase templates |
| `docs/PITCH_EMAIL_SOUTHPARK.md` | Research-informed email from Anish |

**Estimate:** 1–2 days dev to refactor existing repo vs 3–5 days greenfield.

---

## Pricing to present (managed service)

| Plan | Implementation | Monthly | Fit |
|------|----------------|---------|-----|
| **Pilot: Project Coordination Desk** | $1,500 | $750 | One property / one TI project |
| **Owner Operations Desk** ⭐ | **$3,500** | **$1,500** | Up to 3 projects, 8 routing groups |
| **Portfolio Operations Desk** | $7,500+ | $3,000–$5,000 | Multi-property, custom integrations |

**Lead with:** $3,500 + $1,500/mo · 90-day initial term

Do **not** lead with $399/mo bot pricing.

---

## Safety rules (contract + demo)

- No change orders, budget approval, work authorization, or lease offers via AI
- No legal, engineering, code, safety, or permitting advice
- Safety emergencies → human + 911 instruction
- All routing/escalations logged
- Imran approves scripts, contacts, and thresholds before production

---

## What I need from you (Anish)

| Item | Status |
|------|--------|
| Vapi API key + assistant on 682-727-3062 | ☐ |
| Twilio SMS on same or linked account | ☐ |
| Airtable base created | ☐ |
| n8n instance URL | ☐ |
| Your test phone for owner SMS | ☐ |
| Imran's email for pitch send | ☐ |
| Confirm: rebrand demo away from "construction lead capture" | ☐ |

**Claude Pro handoff:** Run entity/project deep dive using `SOUTHPARK_RESEARCH.md` (see open tasks at bottom of that file).
