import type { AppConfig } from '../config.js';
import type { NormalizedLead } from '../types/lead.js';
import { createAirtableLead, updateAirtableLeadFlags } from '../integrations/airtable.js';
import { sendOwnerLeadEmail } from '../integrations/email.js';
import { sendSms } from '../integrations/twilio.js';
import {
  customerConfirmationSms,
  ownerNeedsReviewSms,
  ownerQualifiedSms,
  ownerUrgentSms,
  salesQualifiedSms,
} from '../sms/templates.js';

function followUpAtMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export type IntakeResult = {
  lead: NormalizedLead;
  airtableRecordId?: string;
  smsSent: {
    owner?: boolean;
    sales?: boolean;
    customer?: boolean;
    caller?: boolean;
  };
  emailSent?: {
    owner?: boolean;
  };
};

/** Simple demo flow: email owner only (no SMS — zero Twilio cost). */
async function processDemoIntake(lead: NormalizedLead, config: AppConfig, result: IntakeResult) {
  const email = await sendOwnerLeadEmail(lead, config);
  if (email) {
    result.emailSent = { owner: true };
  }
}

export async function processLeadIntake(
  lead: NormalizedLead,
  config: AppConfig,
): Promise<IntakeResult> {
  const result: IntakeResult = {
    lead,
    smsSent: {},
  };

  if (config.demoMode) {
    await processDemoIntake(lead, config, result);
    return result;
  }

  const airtable = await createAirtableLead(lead, config);
  if (airtable) result.airtableRecordId = airtable.id;

  const status = lead.lead_status;

  if (status === 'Urgent') {
    await sendSms(config, config.ownerPhone, ownerUrgentSms(lead, config));
    result.smsSent.owner = true;
  } else if (status === 'Qualified') {
    await sendSms(config, config.ownerPhone, ownerQualifiedSms(lead, config));
    result.smsSent.owner = true;

    if (config.enableSalesSms) {
      await sendSms(config, config.salesRepPhone, salesQualifiedSms(lead, config));
      result.smsSent.sales = true;
    }

    if (config.enableCustomerSms && lead.phone_e164) {
      await sendSms(config, lead.phone_e164, customerConfirmationSms(lead, config));
      result.smsSent.customer = true;
    }

    if (result.airtableRecordId) {
      await updateAirtableLeadFlags(result.airtableRecordId, {
        ownerAlertSent: result.smsSent.owner,
        salesAlertSent: result.smsSent.sales,
        customerConfirmationSent: result.smsSent.customer,
        nextFollowUpAt: followUpAtMinutes(15),
      }, config);
    }
  } else if (status === 'Needs Review') {
    await sendSms(config, config.ownerPhone, ownerNeedsReviewSms(lead, config));
    result.smsSent.owner = true;

    if (config.enableCustomerSms && lead.phone_e164) {
      await sendSms(config, lead.phone_e164, customerConfirmationSms(lead, config));
      result.smsSent.customer = true;
    }

    if (result.airtableRecordId) {
      await updateAirtableLeadFlags(result.airtableRecordId, {
        ownerAlertSent: true,
        customerConfirmationSent: result.smsSent.customer,
        nextFollowUpAt: followUpAtMinutes(24 * 60),
      }, config);
    }
  } else if (status === 'Not a Fit') {
    if (config.enableCustomerSms && lead.phone_e164) {
      await sendSms(config, lead.phone_e164, customerConfirmationSms(lead, config));
      result.smsSent.customer = true;
    }
  }

  return result;
}
