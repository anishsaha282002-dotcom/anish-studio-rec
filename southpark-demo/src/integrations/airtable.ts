import type { AppConfig } from '../config.js';
import type { NormalizedLead } from '../types/lead.js';

type AirtableFieldValue = string | number | boolean | undefined;

export function leadToAirtableFields(lead: NormalizedLead): Record<string, AirtableFieldValue> {
  return {
    'Lead Status': lead.lead_status,
    'Caller Type': lead.caller_type,
    'Full Name': lead.full_name ?? '',
    Phone: lead.phone_e164 ?? lead.phone ?? '',
    Email: lead.email ?? '',
    Company: lead.company ?? '',
    'Project Type': lead.project_type ?? '',
    'Property Type': lead.property_type ?? '',
    'Project Location': lead.project_location ?? '',
    City: lead.city ?? '',
    'ZIP Code': lead.zip_code ?? '',
    'Scope Description': lead.scope_description ?? '',
    'Budget Range': lead.budget_range ?? '',
    Timeline: lead.timeline ?? '',
    'Decision Maker': lead.decision_maker ?? 'Unknown',
    'Preferred Next Step': lead.preferred_next_step ?? '',
    Urgency: lead.urgency ?? 'Routine',
    'Recommended Routing': lead.recommended_routing ?? '',
    'Owner Alert Sent': false,
    'Sales Alert Sent': false,
    'Customer Confirmation Sent': false,
    'Follow-Up Status': 'New',
    Notes: lead.notes ?? '',
    'Call Summary': lead.call_summary ?? '',
    'Call Recording URL': lead.recording_url ?? '',
    'Transcript URL': lead.transcript_url ?? '',
    'Vapi Call ID': lead.call_id ?? '',
  };
}

export async function createAirtableLead(
  lead: NormalizedLead,
  config: AppConfig,
): Promise<{ id: string } | null> {
  const { apiKey, baseId, leadsTable } = config.airtable;
  if (!apiKey || !baseId) {
    return null;
  }

  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(leadsTable)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: leadToAirtableFields(lead) }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Airtable create failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { id: string };
  return { id: data.id };
}

export async function updateAirtableLeadFlags(
  recordId: string,
  flags: Partial<{
    ownerAlertSent: boolean;
    salesAlertSent: boolean;
    customerConfirmationSent: boolean;
    nextFollowUpAt: string;
  }>,
  config: AppConfig,
): Promise<void> {
  const { apiKey, baseId, leadsTable } = config.airtable;
  if (!apiKey || !baseId) return;

  const fields: Record<string, unknown> = {};
  if (flags.ownerAlertSent != null) fields['Owner Alert Sent'] = flags.ownerAlertSent;
  if (flags.salesAlertSent != null) fields['Sales Alert Sent'] = flags.salesAlertSent;
  if (flags.customerConfirmationSent != null) {
    fields['Customer Confirmation Sent'] = flags.customerConfirmationSent;
  }
  if (flags.nextFollowUpAt) fields['Next Follow-Up At'] = flags.nextFollowUpAt;

  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(leadsTable)}/${recordId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Airtable update failed (${response.status}): ${text}`);
  }
}
