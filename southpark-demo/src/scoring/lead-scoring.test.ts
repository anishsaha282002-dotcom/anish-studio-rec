import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config.js';
import { normalizeLead, parseBudgetAmount, normalizePhoneToE164 } from './lead-scoring.js';
import type { LeadReport } from '../types/lead.js';

const config = loadConfig();

const demoQualifiedLead: LeadReport = {
  caller_type: 'New Lead',
  full_name: 'Test Caller',
  phone: '325-555-0100',
  email: 'test@example.com',
  project_type: 'Commercial Renovation',
  property_type: 'Restaurant',
  project_location: '123 Main St, Abilene, TX',
  city: 'Abilene',
  zip_code: '79601',
  scope_description: 'Restaurant remodel including dining area and kitchen updates',
  budget_range: '$50,000',
  timeline: 'Within 30 days',
  decision_maker: 'Yes',
  preferred_next_step: 'On-Site Estimate',
  urgency: 'Routine',
  call_summary: 'Caller wants commercial restaurant remodel estimate in Abilene.',
};

describe('parseBudgetAmount', () => {
  it('parses dollar amounts', () => {
    expect(parseBudgetAmount('$50,000')).toBe(50_000);
    expect(parseBudgetAmount('25k')).toBe(25_000);
  });

  it('returns null for unknown budgets', () => {
    expect(parseBudgetAmount('Not yet determined')).toBeNull();
  });
});

describe('normalizePhoneToE164', () => {
  it('normalizes US numbers', () => {
    expect(normalizePhoneToE164('325-555-0100')).toBe('+13255550100');
  });
});

describe('scoreLead demo script', () => {
  it('qualifies the Abilene restaurant remodel test lead', () => {
    const lead = normalizeLead(demoQualifiedLead, config);
    expect(lead.lead_status).toBe('Qualified');
    expect(lead.phone_e164).toBe('+13255550100');
  });

  it('marks emergency calls urgent', () => {
    const lead = normalizeLead(
      {
        ...demoQualifiedLead,
        scope_description: 'Active flooding in the commercial kitchen',
        urgency: 'Emergency',
      },
      config,
    );
    expect(lead.lead_status).toBe('Urgent');
  });

  it('marks out-of-area leads not a fit', () => {
    const lead = normalizeLead(
      {
        ...demoQualifiedLead,
        project_location: 'Los Angeles, CA',
        city: 'Los Angeles',
        zip_code: '90001',
      },
      config,
    );
    expect(lead.lead_status).toBe('Not a Fit');
  });

  it('marks low residential budget not a fit', () => {
    const lead = normalizeLead(
      {
        ...demoQualifiedLead,
        property_type: 'Residential',
        project_type: 'Interior Painting',
        budget_range: '$2,500',
      },
      config,
    );
    expect(lead.lead_status).toBe('Not a Fit');
  });

  it('needs review when phone missing', () => {
    const lead = normalizeLead({ ...demoQualifiedLead, phone: undefined }, config);
    expect(lead.lead_status).toBe('Needs Review');
  });
});
