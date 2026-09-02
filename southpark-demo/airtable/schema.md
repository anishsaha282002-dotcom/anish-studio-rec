# Airtable Leads Table Schema

Create a base and table named **Leads** (or set `AIRTABLE_LEADS_TABLE`).

| Field | Type | Notes |
|-------|------|-------|
| Lead ID | Autonumber | Primary field optional |
| Created At | Created time | Auto |
| Lead Status | Single select | Qualified, Needs Review, Not a Fit, Urgent |
| Caller Type | Single select | New Lead, Existing Customer, Vendor, Subcontractor, Broker, Tenant, Inspector, Other |
| Full Name | Single line text | |
| Phone | Phone | E.164 preferred |
| Email | Email | |
| Company | Single line text | |
| Project Type | Single line text | |
| Property Type | Single select | Residential, Commercial, Restaurant, Retail, Office, Other |
| Project Location | Long text | |
| City | Single line text | |
| ZIP Code | Single line text | |
| Scope Description | Long text | |
| Budget Range | Single line text | |
| Timeline | Single select | Emergency, Within 30 days, 1-3 months, 3+ months, Planning |
| Decision Maker | Single select | Yes, No, Unknown |
| Preferred Next Step | Single select | Phone Consultation, On-Site Estimate, Other |
| Urgency | Single select | Routine, Urgent, Emergency |
| Recommended Routing | Single select | Owner, Sales Rep, Project Team, Emergency Contact, Other |
| Owner Alert Sent | Checkbox | |
| Sales Alert Sent | Checkbox | |
| Customer Confirmation Sent | Checkbox | |
| Follow-Up Status | Single select | New, Contacted, Appointment Set, Estimate Sent, Won, Lost |
| Next Follow-Up At | Date/time | |
| Notes | Long text | |
| Call Summary | Long text | |
| Call Recording URL | URL | |
| Transcript URL | URL | |
| Vapi Call ID | Single line text | |

## Recommended views

- **Qualified – New** — `Lead Status = Qualified` AND `Follow-Up Status = New`
- **Needs Review** — `Lead Status = Needs Review`
- **Urgent** — `Lead Status = Urgent`
- **No Follow-Up** — `Follow-Up Status = New` AND `Next Follow-Up At` is in the past
- **All Leads** — no filter
