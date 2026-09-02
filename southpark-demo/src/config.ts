import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

loadDotenv();

const __dirname = dirname(fileURLToPath(import.meta.url));

const EnvSchema = z.object({
  BUSINESS_NAME: z.string().default('Southpark Investments'),
  ASSISTANT_NAME: z.string().default('Southpark Project Intake Assistant'),
  DEMO_PHONE_NUMBER: z.string().optional(),
  OWNER_NAME: z.string().default('Owner'),
  OWNER_PHONE: z.string().optional(),
  SALES_REP_NAME: z.string().default('Sales Rep'),
  SALES_REP_PHONE: z.string().optional(),
  OWNER_EMAIL: z.string().default('info.spam@gmail.com'),
  SALES_REP_EMAIL: z.string().optional(),
  SERVICE_AREAS: z.string().default('Abilene,Texas,DFW'),
  ACCEPTED_SERVICES: z.string().default(
    'Commercial Renovation,Tenant Improvement,Restaurant Build-Out,Retail Build-Out,Office Remodel,Interior Renovation,General Construction,Painting,Flooring,Drywall,Demolition',
  ),
  MINIMUM_BUDGET: z.coerce.number().default(10_000),
  VAPI_API_KEY: z.string().optional(),
  VAPI_ASSISTANT_ID: z.string().optional(),
  VAPI_WEBHOOK_SECRET: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_SMS_NUMBER: z.string().optional(),
  AIRTABLE_API_KEY: z.string().optional(),
  AIRTABLE_BASE_ID: z.string().optional(),
  AIRTABLE_LEADS_TABLE: z.string().default('Leads'),
  GOOGLE_CALENDAR_ID: z.string().optional(),
  CALENDLY_URL: z.string().optional(),
  N8N_WEBHOOK_URL: z.string().optional(),
  PORT: z.coerce.number().default(8787),
  WEBHOOK_PATH: z.string().default('/webhooks/vapi/end-of-call'),
  ENABLE_CUSTOMER_SMS: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),
  ENABLE_SALES_SMS: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),
  DEMO_MODE: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

export type AppConfig = {
  businessName: string;
  assistantName: string;
  demoPhoneNumber?: string;
  ownerName: string;
  ownerPhone?: string;
  salesRepName: string;
  salesRepPhone?: string;
  ownerEmail?: string;
  salesRepEmail?: string;
  serviceAreas: string[];
  acceptedServices: string[];
  minimumBudget: number;
  vapi: {
    apiKey?: string;
    assistantId?: string;
    webhookSecret?: string;
  };
  twilio: {
    accountSid?: string;
    authToken?: string;
    smsNumber?: string;
  };
  airtable: {
    apiKey?: string;
    baseId?: string;
    leadsTable: string;
  };
  scheduling: {
    googleCalendarId?: string;
    calendlyUrl?: string;
  };
  n8nWebhookUrl?: string;
  port: number;
  webhookPath: string;
  enableCustomerSms: boolean;
  enableSalesSms: boolean;
  demoMode: boolean;
  email: {
    resendApiKey?: string;
    fromAddress?: string;
  };
};

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function loadJsonConfig(): Record<string, unknown> {
  const path = resolve(__dirname, '../config/default.config.json');
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

export function loadConfig(): AppConfig {
  const json = loadJsonConfig();
  const merged = { ...process.env, ...flattenJsonToEnv(json) };
  const env = EnvSchema.parse(merged);

  return {
    businessName: env.BUSINESS_NAME,
    assistantName: env.ASSISTANT_NAME,
    demoPhoneNumber: env.DEMO_PHONE_NUMBER,
    ownerName: env.OWNER_NAME,
    ownerPhone: env.OWNER_PHONE,
    salesRepName: env.SALES_REP_NAME,
    salesRepPhone: env.SALES_REP_PHONE,
    ownerEmail: env.OWNER_EMAIL,
    salesRepEmail: env.SALES_REP_EMAIL,
    serviceAreas: parseList(env.SERVICE_AREAS),
    acceptedServices: parseList(env.ACCEPTED_SERVICES),
    minimumBudget: env.MINIMUM_BUDGET,
    vapi: {
      apiKey: env.VAPI_API_KEY,
      assistantId: env.VAPI_ASSISTANT_ID,
      webhookSecret: env.VAPI_WEBHOOK_SECRET,
    },
    twilio: {
      accountSid: env.TWILIO_ACCOUNT_SID,
      authToken: env.TWILIO_AUTH_TOKEN,
      smsNumber: env.TWILIO_SMS_NUMBER,
    },
    airtable: {
      apiKey: env.AIRTABLE_API_KEY,
      baseId: env.AIRTABLE_BASE_ID,
      leadsTable: env.AIRTABLE_LEADS_TABLE,
    },
    scheduling: {
      googleCalendarId: env.GOOGLE_CALENDAR_ID,
      calendlyUrl: env.CALENDLY_URL,
    },
    n8nWebhookUrl: env.N8N_WEBHOOK_URL,
    port: env.PORT,
    webhookPath: env.WEBHOOK_PATH,
    enableCustomerSms: env.ENABLE_CUSTOMER_SMS,
    enableSalesSms: env.ENABLE_SALES_SMS,
    demoMode: env.DEMO_MODE,
    email: {
      resendApiKey: env.RESEND_API_KEY,
      fromAddress: env.EMAIL_FROM,
    },
  };
}

function flattenJsonToEnv(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const envKey = prefix ? `${prefix}_${key.toUpperCase()}` : key.toUpperCase();
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flattenJsonToEnv(value as Record<string, unknown>, envKey));
    } else if (Array.isArray(value)) {
      out[envKey] = value.join(',');
    } else if (value != null) {
      out[envKey] = String(value);
    }
  }
  return out;
}
