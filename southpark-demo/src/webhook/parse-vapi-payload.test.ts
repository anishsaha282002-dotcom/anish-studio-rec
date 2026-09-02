import { describe, expect, it } from 'vitest';
import { extractCallerPhoneE164, extractLeadReport } from '../webhook/parse-vapi-payload.js';

describe('extractLeadReport', () => {
  it('extracts structured data from Vapi end-of-call payload', () => {
    const report = extractLeadReport({
      message: {
        type: 'end-of-call-report',
        call: {
          id: 'call_123',
          startedAt: '2026-09-02T10:00:00Z',
          recordingUrl: 'https://example.com/recording',
        },
        analysis: {
          structuredData: {
            caller_type: 'New Lead',
            full_name: 'Jane Doe',
            phone: '3255550100',
            project_type: 'Restaurant Build-Out',
            city: 'Abilene',
            budget_range: '$50,000',
          },
          summary: 'Restaurant build-out inquiry in Abilene.',
        },
      },
    });

    expect(report.call_id).toBe('call_123');
    expect(report.full_name).toBe('Jane Doe');
    expect(report.call_summary).toContain('Abilene');
  });

  it('extracts caller phone from customer.number', () => {
    expect(
      extractCallerPhoneE164({
        message: {
          call: { customer: { number: '+18177570311' } },
        },
      }),
    ).toBe('+18177570311');
  });
});
