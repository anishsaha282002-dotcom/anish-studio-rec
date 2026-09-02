/**
 * Southpark Vapi end-of-call webhook — deploy as Google Apps Script web app.
 *
 * Setup (5 min):
 * 1. script.google.com → New project → paste this file
 * 2. Project Settings → Script properties:
 *    TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM (e.g. +16827273062)
 * 3. Deploy → New deployment → Web app → Execute as: Me → Anyone
 * 4. Copy /exec URL → paste into Vapi phone number Server URL (or run scripts/wire-vapi.ts)
 *
 * Sends:
 * - Email to info.spam@gmail.com (via Gmail — no extra API key)
 * - SMS to inbound caller ID (via Twilio script properties, if set)
 */

var OWNER_EMAIL = 'info.spam@gmail.com';

function doPost(e) {
  try {
    var body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    var result = handleVapiWebhook(body);
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
      ContentService.MimeType.JSON,
    );
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleVapiWebhook(body) {
  var call = (body.message && body.message.call) || body.call || {};
  var structured =
    (body.message && body.message.analysis && body.message.analysis.structuredData) ||
    (body.analysis && body.analysis.structuredData) ||
    {};
  var summary =
    structured.call_summary ||
    (body.message && body.message.analysis && body.message.analysis.summary) ||
    (body.analysis && body.analysis.summary) ||
    '';

  var callerPhone = normalizePhone(
    (call.customer && call.customer.number) ||
      (call.phoneNumber && call.phoneNumber.number) ||
      structured.phone,
  );

  var leadStatus = structured.lead_status || 'Needs Review';
  var textBody = formatSms(structured, summary, leadStatus);
  var htmlBody = formatEmailHtml(structured, summary, leadStatus, call);

  var emailSent = GmailApp.sendEmail(OWNER_EMAIL, emailSubject(structured, leadStatus), textBody, {
    htmlBody: htmlBody,
  });

  var smsSent = false;
  if (callerPhone) {
    smsSent = sendTwilioSms(callerPhone, textBody);
  }

  return {
    ok: true,
    emailTo: OWNER_EMAIL,
    emailSent: Boolean(emailSent),
    smsTo: callerPhone || null,
    smsSent: smsSent,
    leadStatus: leadStatus,
  };
}

function emailSubject(structured, leadStatus) {
  var name = structured.full_name || 'Unknown caller';
  return '[Southpark Demo] ' + leadStatus + ' — ' + name;
}

function formatSms(structured, summary, leadStatus) {
  return [
    'Southpark demo — your call summary',
    '',
    'Status: ' + leadStatus,
    'Name: ' + (structured.full_name || 'Unknown'),
    'Project: ' + (structured.project_type || 'Unknown') + ' (' + (structured.property_type || '') + ')',
    'Location: ' + (structured.project_location || structured.city || 'Unknown'),
    'Budget: ' + (structured.budget_range || 'Unknown') + ' | Timeline: ' + (structured.timeline || 'Unknown'),
    '',
    'Scope: ' + (structured.scope_description || 'Unknown'),
    '',
    summary || '',
  ].join('\n');
}

function formatEmailHtml(structured, summary, leadStatus, call) {
  var rows = [
    ['Status', leadStatus],
    ['Caller type', structured.caller_type || 'Unknown'],
    ['Name', structured.full_name || 'Unknown'],
    ['Phone', structured.phone || 'Unknown'],
    ['Email', structured.email || 'Unknown'],
    ['Project', structured.project_type || 'Unknown'],
    ['Property', structured.property_type || 'Unknown'],
    ['Location', structured.project_location || structured.city || 'Unknown'],
    ['Budget', structured.budget_range || 'Unknown'],
    ['Timeline', structured.timeline || 'Unknown'],
    ['Scope', structured.scope_description || 'Unknown'],
    ['Summary', summary || ''],
    ['Call ID', call.id || ''],
    ['Recording', call.recordingUrl || ''],
  ];

  var table = rows
    .map(function (row) {
      return '<tr><td style="padding:4px 12px 4px 0;font-weight:600;">' + row[0] + '</td><td>' + escapeHtml(String(row[1])) + '</td></tr>';
    })
    .join('');

  return '<h2>Southpark demo intake</h2><table>' + table + '</table>';
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizePhone(raw) {
  if (!raw) return null;
  var digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.charAt(0) === '1') return '+' + digits;
  if (String(raw).indexOf('+') === 0 && digits.length >= 10) return '+' + digits;
  return null;
}

function sendTwilioSms(to, body) {
  var props = PropertiesService.getScriptProperties();
  var sid = props.getProperty('TWILIO_ACCOUNT_SID');
  var token = props.getProperty('TWILIO_AUTH_TOKEN');
  var from = props.getProperty('TWILIO_SMS_FROM');
  if (!sid || !token || !from) return false;

  var url =
    'https://api.twilio.com/2010-04-01/Accounts/' +
    sid +
    '/Messages.json';
  var payload = {
    To: to,
    From: from,
    Body: body.substring(0, 1500),
  };

  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    headers: {
      Authorization: 'Basic ' + Utilities.base64Encode(sid + ':' + token),
    },
    payload: payload,
    muteHttpExceptions: true,
  });

  return response.getResponseCode() >= 200 && response.getResponseCode() < 300;
}
