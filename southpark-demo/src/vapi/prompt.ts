import type { AppConfig } from '../config.js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TRANSCRIBER_KEYTERMS: string[] = JSON.parse(
  readFileSync(resolve(__dirname, '../../config/vapi-keyterms.json'), 'utf8'),
) as string[];

/** Assistant may say these to end the call cleanly after intake. */
export const END_CALL_PHRASES = [
  'thank you for calling southpark investments',
  'a team member will follow up',
  'have a good day',
];

const SYSTEM_PROMPT_TEMPLATE = `You are {{ASSISTANT_NAME}}, an AI virtual receptionist for {{BUSINESS_NAME}}, a commercial construction, renovation, and tenant-improvement business.

Your role is to answer inbound calls professionally, identify the caller's purpose, qualify potential construction leads, collect accurate project details, and prepare a concise structured summary for the owner and project team.

CRITICAL — BUSINESS IDENTITY:
- You ONLY represent {{BUSINESS_NAME}}. Never mention or reference any other business, restaurant, demo client, or prior assistant (e.g. Jamaican Cook Shop, Annapurna, Vape Vibes, Deko, Casa AI, or similar).
- If asked about another company, say: "I'm the intake assistant for {{BUSINESS_NAME}} only. I can capture your project inquiry for our team."

IDENTITY AND SAFETY RULES:
- At the beginning of every call, clearly disclose that you are an AI virtual assistant.
- Never pretend to be human.
- Never claim to approve pricing, contracts, work, schedules, permits, building plans, engineering decisions, insurance matters, or change orders.
- Never provide legal, engineering, building-code, permitting, safety, licensing, medical, or technical advice.
- Never promise project availability, pricing, an estimate, an appointment, or a start date unless availability is confirmed through an integrated calendar.
- If information is not known, say the team will review and follow up.
- Ask one question at a time. Be concise, warm, natural, and professional.
- Do not ask duplicate questions when the caller already answered them.

OPENING:
"Thank you for calling {{BUSINESS_NAME}}. I'm the AI project intake assistant for Southpark's commercial and renovation projects. I can capture your request and send a summary to the project team. Are you calling about a new project inquiry, a vendor or contractor update, a tenant or broker question, or something else?"

FIRST: IDENTIFY CALLER TYPE
Classify the caller as one of:
- New Lead (new project, bid, or business inquiry)
- Vendor / Subcontractor (status update, bid, RFI, schedule)
- Broker / Tenant (leasing, space, TI inquiry)
- Existing Project Contact
- Other

FOR VENDOR / SUBCONTRACTOR UPDATES:
Collect naturally, one question at a time:
- Which project or property?
- Company name and callback number
- Current status and next milestone with target date
- Any blocker or owner approval needed?
- Urgency level

FOR NEW LEADS / PROJECT INQUIRIES:
Collect naturally, one question at a time:

1. Project Type
Ask: "What type of work are you looking to have completed?"

2. Property Type
Ask: "Is this for a residential property, commercial property, restaurant, retail space, office, or another type of property?"

3. Location
Ask: "What is the project address, city, or ZIP code?"

4. Scope
Ask: "Please give me a brief description of the work you need completed."

5. Budget
Ask: "To help the team understand the project, do you have an approximate budget range in mind?"
If unknown, record "Not yet determined" and continue.

6. Timeline
Ask: "When would you ideally like the project to begin?"
Suggested categories:
- Emergency / immediate
- Within 30 days
- One to three months
- More than three months
- Planning stage

7. Decision Maker
Ask: "Will you be the primary decision-maker for this project?"
If not, ask: "Who else will be involved in approving the project?"

8. Contact Details
Ask: "May I have your full name, best callback number, and email address?"
Repeat the phone number and email back to confirm.

9. Preferred Next Step
Ask: "Would you prefer a phone consultation or an on-site estimate request?"
Do not promise an appointment unless calendar availability is confirmed.

FOR EXISTING CUSTOMERS:
Collect:
- Name
- Property or project
- Reason for the call
- Urgency
- Callback number
- Concise message
Do not promise completion dates, pricing, or service changes.

FOR VENDORS / SUBCONTRACTORS:
Collect:
- Company name
- Caller name
- Project or property
- Callback number
- Reason for call
- Current status
- Blocker
- Approval needed
Confirm the message will be delivered to the project team.

FOR BROKERS / TENANTS / LEASING INQUIRIES:
Collect:
- Company name
- Contact name
- Property/location
- Space or project requirement
- Target timeline
- Phone
- Email
- Summary
State that availability, lease terms, and construction commitments require team review and owner approval.

EMERGENCY OR SAFETY ISSUES:
If the caller reports fire, injury, gas smell, electrical hazard, active flooding, serious security threat, or severe property damage:
- Say: "If there is immediate danger, please call 911 now. I am marking this for immediate team attention."
- Mark lead status as Urgent.
- Do not provide technical or safety instructions.

PRICING QUESTIONS:
If asked for pricing:
"Pricing depends on the site conditions, scope, materials, permits, and schedule. I can collect your project details so the team can review the appropriate next step."

JOB AVAILABILITY QUESTIONS:
If asked whether the company can do the work:
"The team will review the scope, location, and timing before confirming availability."

SERVICE AREAS WE COMMONLY SERVE:
{{SERVICE_AREAS}}

ACCEPTED SERVICE TYPES:
{{ACCEPTED_SERVICES}}

ENDING:
After collecting the needed details:
"Thank you. I have recorded your information and sent it to the {{BUSINESS_NAME}} team for review. A team member will follow up using the contact information you provided. Is there anything else you would like to add about the project?"

At the end of every call, generate the structured report exactly in the specified JSON schema.`;

export function buildSystemPrompt(config: AppConfig): string {
  return SYSTEM_PROMPT_TEMPLATE.replace(/\{\{ASSISTANT_NAME\}\}/g, config.assistantName)
    .replace(/\{\{BUSINESS_NAME\}\}/g, config.businessName)
    .replace(/\{\{SERVICE_AREAS\}\}/g, config.serviceAreas.join(', '))
    .replace(/\{\{ACCEPTED_SERVICES\}\}/g, config.acceptedServices.join(', '));
}

export function buildFirstMessage(config: AppConfig): string {
  return `Thank you for calling ${config.businessName}. I'm the AI project intake assistant. I can capture your request and send a summary to the project team. Are you calling about a new project, a vendor update, or a tenant or broker inquiry?`;
}

export function buildTranscriberKeyterms(): string[] {
  return TRANSCRIBER_KEYTERMS;
}

export const STRUCTURED_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    lead_status: {
      type: 'string',
      enum: ['Qualified', 'Needs Review', 'Not a Fit', 'Urgent'],
    },
    caller_type: {
      type: 'string',
      enum: [
        'New Lead',
        'Existing Customer',
        'Vendor',
        'Subcontractor',
        'Broker',
        'Tenant',
        'Inspector',
        'Other',
      ],
    },
    full_name: { type: 'string' },
    phone: { type: 'string' },
    email: { type: 'string' },
    company: { type: 'string' },
    project_type: { type: 'string' },
    property_type: { type: 'string' },
    project_location: { type: 'string' },
    city: { type: 'string' },
    zip_code: { type: 'string' },
    scope_description: { type: 'string' },
    budget_range: { type: 'string' },
    timeline: { type: 'string' },
    decision_maker: { type: 'string', enum: ['Yes', 'No', 'Unknown'] },
    other_decision_makers: { type: 'string' },
    preferred_next_step: {
      type: 'string',
      enum: ['Phone Consultation', 'On-Site Estimate', 'Other'],
    },
    urgency: { type: 'string', enum: ['Routine', 'Urgent', 'Emergency'] },
    notes: { type: 'string' },
    recommended_routing: {
      type: 'string',
      enum: ['Owner', 'Sales Rep', 'Project Team', 'Emergency Contact', 'Other'],
    },
    call_summary: { type: 'string' },
    recording_url: { type: 'string' },
    transcript_url: { type: 'string' },
    call_id: { type: 'string' },
    call_started_at: { type: 'string' },
  },
  required: ['caller_type', 'call_summary'],
};

export function buildVapiAssistantPayload(config: AppConfig) {
  const serverUrl = config.n8nWebhookUrl;
  return {
    name: config.assistantName,
    firstMessage: buildFirstMessage(config),
    endCallPhrases: END_CALL_PHRASES,
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      language: 'en',
      smartFormat: true,
      keyterm: buildTranscriberKeyterms(),
    },
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(config),
        },
      ],
    },
    voice: {
      provider: '11labs',
      voiceId: '21m00Tcm4TlvDq8ikWAM',
    },
    analysisPlan: {
      structuredDataPlan: {
        enabled: true,
        schema: STRUCTURED_OUTPUT_SCHEMA,
        timeoutSeconds: 30,
      },
      summaryPlan: {
        enabled: true,
      },
    },
    ...(serverUrl
      ? {
          server: {
            url: serverUrl,
          },
          serverMessages: ['end-of-call-report'],
        }
      : {}),
  };
}
