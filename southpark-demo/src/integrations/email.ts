import type { AppConfig } from '../config.js';
import type { NormalizedLead } from '../types/lead.js';

export type EmailResult = { id?: string; to: string };

function buildLeadEmailBody(lead: NormalizedLead, config: AppConfig): { subject: string; text: string } {
  const subject = `[${config.businessName}] ${lead.lead_status} — ${lead.full_name ?? 'Unknown caller'}`;
  const text = [
    `${config.businessName} — call intake summary`,
    '',
    `Status: ${lead.lead_status}`,
    `Caller type: ${lead.caller_type}`,
    `Name: ${lead.full_name ?? 'Unknown'}`,
    `Phone: ${lead.phone ?? lead.phone_e164 ?? 'Unknown'}`,
    `Email: ${lead.email ?? 'Unknown'}`,
    `Project: ${lead.project_type ?? 'Unknown'}`,
    `Property: ${lead.property_type ?? 'Unknown'}`,
    `Location: ${lead.project_location ?? lead.city ?? 'Unknown'}`,
    `Budget: ${lead.budget_range ?? 'Unknown'}`,
    `Timeline: ${lead.timeline ?? 'Unknown'}`,
    `Decision maker: ${lead.decision_maker ?? 'Unknown'}`,
    '',
    `Scope: ${lead.scope_description ?? 'Unknown'}`,
    '',
    `Summary: ${lead.call_summary ?? lead.notes ?? 'No summary'}`,
    '',
    lead.recording_url ? `Recording: ${lead.recording_url}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, text };
}

async function sendViaResend(
  to: string,
  subject: string,
  text: string,
  apiKey: string,
  from: string,
): Promise<EmailResult> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend email failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { id?: string };
  return { id: data.id, to };
}

export async function sendOwnerLeadEmail(
  lead: NormalizedLead,
  config: AppConfig,
): Promise<EmailResult | null> {
  const to = config.ownerEmail?.trim();
  if (!to) return null;

  const { subject, text } = buildLeadEmailBody(lead, config);
  const resendKey = config.email.resendApiKey;
  const from = config.email.fromAddress ?? 'Southpark Demo <onboarding@resend.dev>';

  if (!resendKey) {
    console.warn('[email] Resend not configured — would send:', { to, subject });
    return null;
  }

  return sendViaResend(to, subject, text, resendKey, from);
}
