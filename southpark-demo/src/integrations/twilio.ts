import twilio from 'twilio';
import type { AppConfig } from '../config.js';

export type SmsResult = { sid: string; to: string };

export function createTwilioClient(config: AppConfig) {
  const { accountSid, authToken, smsNumber } = config.twilio;
  if (!accountSid || !authToken || !smsNumber) {
    return null;
  }
  return {
    client: twilio(accountSid, authToken),
    from: smsNumber,
  };
}

export async function sendSms(
  config: AppConfig,
  to: string | undefined,
  body: string,
): Promise<SmsResult | null> {
  if (!to?.trim()) return null;
  const tw = createTwilioClient(config);
  if (!tw) {
    console.warn('[sms] Twilio not configured — would send:', { to, body: body.slice(0, 80) });
    return null;
  }

  const message = await tw.client.messages.create({
    to,
    from: tw.from,
    body,
  });

  return { sid: message.sid, to };
}
