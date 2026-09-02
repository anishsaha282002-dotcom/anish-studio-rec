/** Southpark Vapi webhook — email only (no SMS / no Twilio cost). */

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'info.spam@gmail.com';

function pickStructured(body) {
  const structured =
    body?.message?.analysis?.structuredData ||
    body?.analysis?.structuredData ||
    {};
  const call = body?.message?.call || body?.call || {};
  return {
    structured,
    summary:
      structured.call_summary ||
      body?.message?.analysis?.summary ||
      body?.analysis?.summary ||
      '',
    call,
  };
}

function formatSummary(structured, summary, leadStatus) {
  return [
    'Southpark demo — call intake summary',
    '',
    `Status: ${leadStatus}`,
    `Caller type: ${structured.caller_type || 'Unknown'}`,
    `Name: ${structured.full_name || 'Unknown'}`,
    `Phone: ${structured.phone || 'Unknown'}`,
    `Email: ${structured.email || 'Unknown'}`,
    `Project: ${structured.project_type || 'Unknown'} (${structured.property_type || ''})`,
    `Location: ${structured.project_location || structured.city || 'Unknown'}`,
    `Budget: ${structured.budget_range || 'Unknown'} | Timeline: ${structured.timeline || 'Unknown'}`,
    '',
    `Scope: ${structured.scope_description || 'Unknown'}`,
    '',
    summary || '',
  ].join('\n');
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
    res.status(200).json({ ok: true, ownerEmail: OWNER_EMAIL, smsEnabled: false });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { structured, summary } = pickStructured(req.body);
    const leadStatus = structured.lead_status || 'Needs Review';
    const textBody = formatSummary(structured, summary, leadStatus);
    const subject = `[Southpark Demo] ${leadStatus} — ${structured.full_name || 'Unknown caller'}`;

    const emailResult = await sendResendEmail(OWNER_EMAIL, subject, textBody);

    res.status(200).json({
      ok: true,
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
