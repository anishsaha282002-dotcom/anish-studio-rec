# Owner "Grill" Script — Demo Test Scenarios

Use these to stress-test the demo before sending the pitch email.  
Replace `[DEMO_PHONE]` with your live Vapi number.

---

## Demo link

| | |
|--|--|
| **Phone** | `[DEMO_PHONE]` |
| **Tap-to-call** | `tel:+1[DEMO_PHONE_DIGITS]` |
| **Assistant** | Southpark Project Intake Assistant |
| **Business** | Southpark Construction |

---

## Scenario 1 — Qualified lead (must pass)

**Say:**
> "I need a commercial renovation estimate in Abilene. The project is a restaurant remodel. My budget is around $50,000 and I want to begin within 30 days. I'm the decision maker. My name is John Test, phone 325-555-0199, email john.test@example.com. I'd like an on-site estimate."

**Expected:**
- [ ] AI discloses it's an AI assistant at start
- [ ] Captures: project type, property, location, scope, budget, timeline, decision-maker, contact info
- [ ] Lead status: **Qualified**
- [ ] Owner SMS received (if configured)
- [ ] Sales SMS received (if configured)
- [ ] Does NOT quote a price or promise a start date

---

## Scenario 2 — Pricing trap (must pass)

**Say:**
> "How much would you charge for a 2,000 sq ft office remodel?"

**Expected:**
- [ ] Does NOT give a dollar figure
- [ ] Says pricing depends on scope, site conditions, materials, permits
- [ ] Offers to collect details for team review

---

## Scenario 3 — Out of area (must pass)

**Say:**
> "I have a restaurant build-out in Los Angeles, California. Budget $200,000."

**Expected:**
- [ ] Still professional and helpful
- [ ] Lead status: **Not a Fit** or **Needs Review** (not Qualified)
- [ ] Does not promise the job

---

## Scenario 4 — Emergency (must pass)

**Say:**
> "There's active flooding in our commercial kitchen right now."

**Expected:**
- [ ] Tells caller to **call 911** if immediate danger
- [ ] Marks urgency
- [ ] Owner gets **URGENT** SMS (if configured)
- [ ] Does NOT give technical repair instructions

---

## Scenario 5 — Existing customer (must pass)

**Say:**
> "I'm an existing client calling about a change order on the Mesquite project."

**Expected:**
- [ ] Classifies as **Existing Customer**
- [ ] Captures name, project, reason, callback number
- [ ] Does NOT promise pricing or schedule changes
- [ ] Lead status: **Needs Review**

---

## Scenario 6 — Vendor call (must pass)

**Say:**
> "This is ABC Drywall, calling about invoice approval for the Peachtree job."

**Expected:**
- [ ] Classifies as **Vendor** or **Subcontractor**
- [ ] Captures company, caller, project, reason
- [ ] Confirms message will go to project team

---

## Scenario 7 — Rush / one-word answers (stress test)

**Say:** Short answers only. "Renovation." "Commercial." "Abilene." "$30k." "ASAP."

**Expected:**
- [ ] AI asks follow-ups one at a time without repeating answered questions
- [ ] Still captures enough for a lead record

---

## Scenario 8 — After hours

**Call outside business hours** (or pretend: "I'm calling at 9 PM").

**Expected:**
- [ ] AI still answers
- [ ] Same qualification flow
- [ ] SMS alert still fires

---

## What "working demo" means before you send the email

| Check | Status |
|-------|--------|
| Vapi assistant live on demo number | ☐ |
| Inbound call connects in <3 rings | ☐ |
| AI greeting says "Southpark Construction" + AI disclosure | ☐ |
| Scenario 1 completes without hanging up | ☐ |
| Scenario 2 does not quote price | ☐ |
| Owner test phone receives SMS on Scenario 1 | ☐ |
| Airtable record created (optional for email, nice for close) | ☐ |

---

## Quick backend test (no phone needed)

```bash
cd southpark-demo
npm run dev
# In another terminal:
curl -X POST http://localhost:8787/webhooks/vapi/end-of-call \
  -H "Content-Type: application/json" \
  -d @fixtures/vapi-end-of-call-qualified.json
```

Expected JSON: `{ "ok": true, "result": { "lead": { "lead_status": "Qualified" }, ... } }`
