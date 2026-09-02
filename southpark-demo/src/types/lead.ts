import { z } from 'zod';

export const LeadStatusSchema = z.enum(['Qualified', 'Needs Review', 'Not a Fit', 'Urgent']);
export type LeadStatus = z.infer<typeof LeadStatusSchema>;

export const CallerTypeSchema = z.enum([
  'New Lead',
  'Existing Customer',
  'Vendor',
  'Subcontractor',
  'Broker',
  'Tenant',
  'Inspector',
  'Other',
]);
export type CallerType = z.infer<typeof CallerTypeSchema>;

export const LeadReportSchema = z.object({
  lead_status: LeadStatusSchema.optional(),
  caller_type: CallerTypeSchema.optional(),
  full_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  company: z.string().optional(),
  project_type: z.string().optional(),
  property_type: z.string().optional(),
  project_location: z.string().optional(),
  city: z.string().optional(),
  zip_code: z.string().optional(),
  scope_description: z.string().optional(),
  budget_range: z.string().optional(),
  timeline: z.string().optional(),
  decision_maker: z.enum(['Yes', 'No', 'Unknown']).optional(),
  other_decision_makers: z.string().optional(),
  preferred_next_step: z.enum(['Phone Consultation', 'On-Site Estimate', 'Other']).optional(),
  urgency: z.enum(['Routine', 'Urgent', 'Emergency']).optional(),
  notes: z.string().optional(),
  recommended_routing: z
    .enum(['Owner', 'Sales Rep', 'Project Team', 'Emergency Contact', 'Other'])
    .optional(),
  call_summary: z.string().optional(),
  recording_url: z.string().optional(),
  transcript_url: z.string().optional(),
  call_id: z.string().optional(),
  call_started_at: z.string().optional(),
});

export type LeadReport = z.infer<typeof LeadReportSchema>;

export type NormalizedLead = LeadReport & {
  lead_status: LeadStatus;
  caller_type: CallerType;
  phone_e164?: string;
  /** Inbound caller ID from the phone network (who dialed in). */
  caller_phone_e164?: string;
};

export const EMERGENCY_KEYWORDS = [
  'fire',
  'injury',
  'injured',
  'gas smell',
  'gas leak',
  'electrical hazard',
  'electrocution',
  'flooding',
  'flood',
  'security threat',
  'break-in',
  'collapse',
  '911',
  'explosion',
  'smoke',
  'carbon monoxide',
];
