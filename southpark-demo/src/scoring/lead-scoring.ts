import type { AppConfig } from '../config.js';
import type { LeadReport, LeadStatus, NormalizedLead } from '../types/lead.js';
import { EMERGENCY_KEYWORDS } from '../types/lead.js';

function normalizeText(value?: string): string {
  return (value ?? '').trim().toLowerCase();
}

export function parseBudgetAmount(budgetRange?: string): number | null {
  if (!budgetRange) return null;
  const lower = budgetRange.toLowerCase();
  if (lower.includes('not yet') || lower.includes('unknown') || lower.includes('tbd')) {
    return null;
  }
  const match = budgetRange.replace(/,/g, '').match(/\$?\s*(\d+(?:\.\d+)?)\s*(k|m)?/i);
  if (!match) return null;
  let amount = Number.parseFloat(match[1]!);
  const suffix = match[2]?.toLowerCase();
  if (suffix === 'k') amount *= 1_000;
  if (suffix === 'm') amount *= 1_000_000;
  return Number.isFinite(amount) ? amount : null;
}

export function normalizePhoneToE164(phone?: string): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (phone.startsWith('+') && digits.length >= 10) return `+${digits}`;
  return undefined;
}

function containsEmergencySignal(report: LeadReport): boolean {
  const haystack = [
    report.scope_description,
    report.notes,
    report.call_summary,
    report.urgency,
  ]
    .map(normalizeText)
    .join(' ');

  if (report.urgency === 'Emergency' || report.urgency === 'Urgent') {
    if (
      EMERGENCY_KEYWORDS.some((kw) => haystack.includes(kw)) ||
      report.urgency === 'Emergency'
    ) {
      return true;
    }
  }

  return EMERGENCY_KEYWORDS.some((kw) => haystack.includes(kw));
}

function isCommercialProperty(propertyType?: string, projectType?: string): boolean {
  const text = `${propertyType ?? ''} ${projectType ?? ''}`.toLowerCase();
  return /commercial|restaurant|retail|office|tenant|build-out|buildout|warehouse|industrial/.test(
    text,
  );
}

function locationInServiceArea(
  report: LeadReport,
  serviceAreas: string[],
): 'inside' | 'plausible' | 'outside' | 'unknown' {
  const location = [
    report.project_location,
    report.city,
    report.zip_code,
    report.notes,
  ]
    .map(normalizeText)
    .join(' ');

  if (!location.trim()) return 'unknown';

  const outOfAreaStates =
    /\b(california|\bca\b|new york|\bny\b|florida|\bfl\b|nevada|\bnv\b|arizona|\baz\b|colorado|\bco\b|washington|\bwa\b|oregon|\bor\b|georgia|\bga\b|illinois|\bil\b|ohio|\boh\b|pennsylvania|\bpa\b|new jersey|\bnj\b|massachusetts|\bma\b|connecticut|\bct\b|minnesota|\bmn\b|missouri|\bmo\b|tennessee|\btn\b|louisiana|\bla\b|oklahoma|\bok\b|new mexico|\bnm\b|utah|\but\b|hawaii|\bhi\b|alaska|\bak\b)\b/;

  const texasSignals = /texas|\btx\b|abilene|dallas|fort worth|dfw|mesquite|plano|arlington|denton|frisco|mckinney|irving|garland|tyler|waco|lubbock|midland|odessa|southlake|grapevine|richardson|carrollton|allen|lewisville|flower mound/;
  const matched = serviceAreas.some((area) => location.includes(area.toLowerCase()));

  if (outOfAreaStates.test(location) && !texasSignals.test(location)) return 'outside';
  if (matched || texasSignals.test(location)) return 'inside';
  if (/^[0-9]{5}$/.test(report.zip_code ?? '')) return 'plausible';
  return 'unknown';
}

function serviceMatches(projectType: string | undefined, acceptedServices: string[]): boolean {
  if (!projectType?.trim()) return false;
  const normalized = projectType.toLowerCase();
  return acceptedServices.some((service) => {
    const s = service.toLowerCase();
    return normalized.includes(s) || s.includes(normalized);
  });
}

function isConstructionLike(projectType?: string, scope?: string): boolean {
  const text = `${projectType ?? ''} ${scope ?? ''}`.toLowerCase();
  return /renovation|remodel|build|construction|tenant|improvement|drywall|flooring|paint|demolition|commercial|restaurant|retail|office/.test(
    text,
  );
}

export function scoreLead(report: LeadReport, config: AppConfig): LeadStatus {
  if (containsEmergencySignal(report)) return 'Urgent';

  const callerType = report.caller_type ?? 'Other';

  if (callerType !== 'New Lead') {
    if (callerType === 'Existing Customer' || callerType === 'Vendor' || callerType === 'Subcontractor') {
      return 'Needs Review';
    }
    if (callerType === 'Broker' || callerType === 'Tenant') {
      return 'Needs Review';
    }
  }

  const phone = normalizePhoneToE164(report.phone);
  const locationStatus = locationInServiceArea(report, config.serviceAreas);
  const budgetAmount = parseBudgetAmount(report.budget_range);
  const commercial = isCommercialProperty(report.property_type, report.project_type);
  const serviceOk =
    serviceMatches(report.project_type, config.acceptedServices) ||
    isConstructionLike(report.project_type, report.scope_description);

  if (locationStatus === 'outside') return 'Not a Fit';

  if (
    budgetAmount != null &&
    budgetAmount < config.minimumBudget &&
    !commercial
  ) {
    return 'Not a Fit';
  }

  if (!phone && callerType === 'New Lead') {
    return 'Needs Review';
  }

  if (callerType === 'New Lead' && serviceOk && phone) {
    const locationOk = locationStatus === 'inside' || locationStatus === 'plausible' || locationStatus === 'unknown';
    const budgetOk =
      budgetAmount == null ||
      budgetAmount >= config.minimumBudget ||
      commercial ||
      normalizeText(report.budget_range).includes('not yet');

    const authorityOk =
      report.decision_maker === 'Yes' ||
      report.decision_maker === 'Unknown' ||
      Boolean(report.other_decision_makers?.trim());

    if (locationOk && budgetOk && authorityOk) return 'Qualified';
    return 'Needs Review';
  }

  if (callerType === 'New Lead') return 'Needs Review';

  return 'Needs Review';
}

export function normalizeLead(report: LeadReport, config: AppConfig): NormalizedLead {
  const lead_status = scoreLead(report, config);
  return {
    ...report,
    lead_status,
    caller_type: report.caller_type ?? 'Other',
    phone_e164: normalizePhoneToE164(report.phone),
    recommended_routing:
      report.recommended_routing ??
      (lead_status === 'Urgent'
        ? 'Emergency Contact'
        : lead_status === 'Qualified'
          ? 'Sales Rep'
          : 'Owner'),
  };
}
