import type { AppConfig } from '../config.js';
import type { NormalizedLead } from '../types/lead.js';

function fill(template: string, lead: NormalizedLead, config: AppConfig): string {
  const vars: Record<string, string> = {
    BUSINESS_NAME: config.businessName,
    lead_status: lead.lead_status,
    full_name: lead.full_name ?? 'Unknown',
    phone: lead.phone ?? lead.phone_e164 ?? 'Unknown',
    email: lead.email ?? 'Unknown',
    project_type: lead.project_type ?? 'Unknown',
    property_type: lead.property_type ?? 'Unknown',
    project_location: lead.project_location ?? lead.city ?? 'Unknown',
    city: lead.city ?? 'Unknown',
    budget_range: lead.budget_range ?? 'Unknown',
    timeline: lead.timeline ?? 'Unknown',
    decision_maker: lead.decision_maker ?? 'Unknown',
    scope_description: lead.scope_description ?? 'Unknown',
    recommended_routing: lead.recommended_routing ?? 'Owner',
    notes: lead.notes ?? lead.call_summary ?? 'Needs manual review',
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

export function demoLeadSummarySms(lead: NormalizedLead, config: AppConfig): string {
  return fill(
    `Southpark demo — your call summary

Status: {{lead_status}}
Name: {{full_name}}
Project: {{project_type}} ({{property_type}})
Location: {{project_location}}
Budget: {{budget_range}} | Timeline: {{timeline}}

Scope: {{scope_description}}

{{notes}}`,
    lead,
    config,
  );
}

export function ownerQualifiedSms(lead: NormalizedLead, config: AppConfig): string {
  return fill(
    `New QUALIFIED {{BUSINESS_NAME}} lead

Name: {{full_name}}
Phone: {{phone}}
Email: {{email}}
Project: {{project_type}}
Property: {{property_type}}
Location: {{project_location}}
Budget: {{budget_range}}
Timeline: {{timeline}}
Decision-maker: {{decision_maker}}

Scope: {{scope_description}}

Action: {{recommended_routing}}`,
    lead,
    config,
  );
}

export function salesQualifiedSms(lead: NormalizedLead, config: AppConfig): string {
  return fill(
    `New lead assigned: {{full_name}}

{{project_type}} | {{city}} | {{budget_range}} | {{timeline}}
Phone: {{phone}}

Scope: {{scope_description}}

Please contact promptly and update lead status.`,
    lead,
    config,
  );
}

export function ownerNeedsReviewSms(lead: NormalizedLead, config: AppConfig): string {
  return fill(
    `${config.businessName} lead needs review

Name: {{full_name}}
Phone: {{phone}}
Project: {{project_type}}
Location: {{project_location}}

Reason: {{notes}}`,
    lead,
    config,
  );
}

export function ownerUrgentSms(lead: NormalizedLead, config: AppConfig): string {
  return fill(
    `URGENT ${config.businessName} call

{{full_name}} | {{phone}}
Location: {{project_location}}
Issue: {{scope_description}}

If immediate danger exists, caller was instructed to call 911.`,
    lead,
    config,
  );
}

export function customerConfirmationSms(lead: NormalizedLead, config: AppConfig): string {
  return fill(
    `Hi {{full_name}}, thank you for contacting {{BUSINESS_NAME}}. We received your request for {{project_type}} at {{project_location}}. A team member will review the details and contact you shortly. Reply STOP to opt out.`,
    lead,
    config,
  );
}

export function followUpReminderSms(lead: NormalizedLead, config: AppConfig): string {
  return fill(
    `Reminder: follow up with {{full_name}} ({{phone}}) — {{project_type}} in {{city}}. Status still New.`,
    lead,
    config,
  );
}
