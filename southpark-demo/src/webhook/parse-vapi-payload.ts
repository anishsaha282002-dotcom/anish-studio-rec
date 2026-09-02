import type { LeadReport } from '../types/lead.js';
import { LeadReportSchema } from '../types/lead.js';

type VapiCall = {
  id?: string;
  startedAt?: string;
  recordingUrl?: string;
  transcriptUrl?: string;
  customer?: { number?: string };
  phoneNumber?: { number?: string };
};

type VapiEndOfCallPayload = {
  message?: {
    type?: string;
    call?: VapiCall;
    analysis?: {
      structuredData?: Record<string, unknown>;
      summary?: string;
    };
    artifact?: {
      structuredOutputs?: Record<string, { result?: Record<string, unknown> }>;
    };
  };
  call?: VapiCall;
  analysis?: {
    structuredData?: Record<string, unknown>;
    summary?: string;
  };
};

function pickStructuredData(payload: VapiEndOfCallPayload): Record<string, unknown> {
  const fromMessage = payload.message?.analysis?.structuredData;
  if (fromMessage && Object.keys(fromMessage).length > 0) return fromMessage;

  const fromRoot = payload.analysis?.structuredData;
  if (fromRoot && Object.keys(fromRoot).length > 0) return fromRoot;

  const outputs = payload.message?.artifact?.structuredOutputs;
  if (outputs) {
    for (const output of Object.values(outputs)) {
      if (output.result && Object.keys(output.result).length > 0) {
        return output.result;
      }
    }
  }

  return {};
}

export function extractCallerPhoneE164(payload: unknown): string | undefined {
  const body = payload as VapiEndOfCallPayload;
  const call = body.message?.call ?? body.call;
  const raw = call?.customer?.number ?? call?.phoneNumber?.number;
  if (!raw?.trim()) return undefined;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (raw.startsWith('+') && digits.length >= 10) return `+${digits}`;
  return undefined;
}

export function extractLeadReport(payload: unknown): LeadReport {
  const body = payload as VapiEndOfCallPayload;
  const structured = pickStructuredData(body);
  const call = body.message?.call ?? body.call;

  const merged: LeadReport = LeadReportSchema.parse({
    ...structured,
    call_summary:
      (structured.call_summary as string | undefined) ??
      body.message?.analysis?.summary ??
      body.analysis?.summary ??
      '',
    recording_url:
      (structured.recording_url as string | undefined) ?? call?.recordingUrl ?? '',
    transcript_url:
      (structured.transcript_url as string | undefined) ?? call?.transcriptUrl ?? '',
    call_id: (structured.call_id as string | undefined) ?? call?.id ?? '',
    call_started_at:
      (structured.call_started_at as string | undefined) ?? call?.startedAt ?? '',
  });

  return merged;
}

export function verifyVapiWebhookSecret(
  provided: string | undefined,
  expected: string | undefined,
): boolean {
  if (!expected) return true;
  return provided === expected;
}
