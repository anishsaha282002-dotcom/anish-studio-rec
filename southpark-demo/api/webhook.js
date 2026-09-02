/** Self-contained Southpark Vapi webhook for Vercel (no monorepo imports). */

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'info.spam@gmail.com';

function normalizePhone(raw) {
  if (!raw) return undefined;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (String(raw).startsWith('+') && digits.length >= 10) return `+${digits}`;
  return undefined;
}

function pickStructured(body) {
  const structured =
    body?.message?.analysis?.structuredData ||
    body?.analysis?.structuredData ||
    {};
  const call = body?.message?.call || body?.call || {};
  return {
    structured,
    call,
    summary:
      structured.call_summary ||
      body?.message?.analysis?.summary ||
      body?.analysis?.summary ||
      '',
    callerPhone:
      normalizePhone(call?.customer?.number || call?.phoneNumber?.number) ||
      normalizePhone(structured.phone),
  };
}

function formatSummary(structured, summary, leadStatus) {
  return [
    'Southpark demo — your call summary',
    '',
    `Status: ${leadStatus}`,
    `Name: ${structured.full_name || 'Unknown'}`,
    `Project: ${structured.project_type || 'Unknown'} (${structured.property_type || ''})`,
    `Location: ${structured.project_location || structured.city || 'Unknown'}`,
    `Budget: ${structured.budget_range || 'Unknown'} | Timeline: ${structured.timeline || 'Unknown'}`,
    '',
    `Scope: ${structured.scope_description || 'Unknown'}`,
    '',
    summary || '',
  ].join('\n');
}

async function sendTwilioSms(to, body) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SMS_NUMBER;
  if (!sid || !token || !from) return null;

  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const params = new URLSearchParams({ To: to, From: from, Body: body.slice(0, 1500) });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twilio SMS failed (${response.status}): ${text}`);
  }
  const data = await response.json();
  return { sid: data.sid, to };
}

async function sendResendEmail(to, subject, text) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  const from = process.env.EMAIL_FROM || 'Southpark Demo <onboarding@resend.dev>';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend email failed (${response.status}): ${body}`);
  }
  const data = await response.json();
  return { id: data.id, to };
}

export default async function handler(req, res) {
  if (req.method === 'GET' && req.url?.includes('health')) {
    res.status(200).json({ ok: true, ownerEmail: OWNER_EMAIL });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { structured, summary, callerPhone } = pickStructured(req.body);
    const leadStatus = structured.lead_status || 'Needs Review';
    const textBody = formatSummary(structured, summary, leadStatus);
    const subject = `[Southpark Demo] ${leadStatus} — ${structured.full_name || 'Unknown caller'}`;

    const smsResult = callerPhone ? await sendTwilioSms(callerPhone, textBody) : null;
    const emailResult = await sendResendEmail(OWNER_EMAIL, subject, textBody);

    res.status(200).json({
      ok: true,
      smsTo: callerPhone || null,
      smsSent: Boolean(smsResult),
      emailTo: OWNER_EMAIL,
      emailSent: Boolean(emailResult),
      leadStatus,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
