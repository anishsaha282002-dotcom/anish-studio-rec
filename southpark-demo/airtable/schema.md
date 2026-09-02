# Airtable — Project Coordination Board

Create a base with table **Projects** (or use single **Coordination** table for demo).

## Coordination / Intake Records

| Field | Type | Example |
|-------|------|---------|
| Project ID | Single line text | SP-DEMO-001 |
| Property / Project | Single line text | Southpark Commercial TI — Example |
| Demo Label | Single line text | FICTIONAL DEMO — NOT REAL SOUTHPARK DATA |
| Created At | Created time | Auto |
| Contact Type | Single select | Tenant, Broker, GC, Subcontractor, Vendor, Inspector, Owner Rep, Other |
| Inquiry Type | Single select | Leasing, Bid, Schedule Update, RFI, Maintenance, Approval, Payment Question, Construction Update, Other |
| Priority | Single select | Routine, Urgent, Safety Emergency |
| Full Name | Single line text | |
| Company | Single line text | |
| Phone | Phone | E.164 |
| Email | Email | |
| Reason for Contact | Long text | |
| Urgency Notes | Long text | |
| Requested Action | Long text | |
| Assigned Partner | Single select | Broker, GC, Designer, Property Manager, Owner, Vendor, Emergency |
| Current Status | Single select | New, Waiting on Vendor, Waiting on Owner, Scheduled, Resolved |
| Next Action Date | Date | 2026-09-09 |
| Blocker | Long text | Permit clarification / material lead time / owner approval |
| Decision Required | Single select | Yes, No |
| Approval Deadline | Date | |
| Estimated Schedule Impact | Single line text | 3 days |
| Internal Owner | Single line text | Designated approver |
| Owner Alert Sent | Checkbox | |
| Partner Alert Sent | Checkbox | |
| Customer Confirmation Sent | Checkbox | |
| Follow-Up Status | Single select | New, Contacted, In Progress, Resolved, Escalated |
| Activity Log | Long text | Timestamped calls, texts, routing |
| Call Summary | Long text | |
| Call Recording URL | URL | |
| Transcript URL | URL | |
| Vapi Call ID | Single line text | |

## Views

- **Decisions Required** — Decision Required = Yes AND Current Status ≠ Resolved
- **Waiting on Vendor** — Current Status = Waiting on Vendor
- **Waiting on Owner** — Current Status = Waiting on Owner
- **Urgent / Safety** — Priority = Urgent OR Safety Emergency
- **This Week** — Next Action Date within 7 days
- **Audit Trail** — All records sorted by Created At desc

## Weekly Executive Brief (generated)

Sections to auto-compile:

1. Completed this week
2. Upcoming milestones (next 7 days)
3. Unresolved blockers
4. Overdue vendors / partners
5. Decisions required (with deadline + impact)
6. Next 7-day priorities
