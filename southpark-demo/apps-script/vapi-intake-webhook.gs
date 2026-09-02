/**
 * Southpark Vapi end-of-call webhook — Google Apps Script (email only, free).
 *
 * Setup:
 * 1. script.google.com → New project → paste this file
 * 2. Deploy → New deployment → Web app → Execute as: Me → Anyone
 * 3. Copy /exec URL → run: WEBHOOK_URL=.../exec npm run wire:vapi
 *
 * Sends email to info.spam@gmail.com via Gmail (no Twilio / no paid SMS).
 */

var OWNER_EMAIL = 'info.spam@gmail.com';

/** Run this from the editor (▶ Run) to test email — pick testEmail in the dropdown first. */
function testEmail() {
  var fakeBody = {
    message: {
      call: { id: 'test_001' },
      analysis: {
        structuredData: {
          lead_status: 'Qualified',
          caller_type: 'New Lead',
          full_name: 'Imran Test',
          phone: '817-555-0100',
          email: 'test@example.com',
          project_type: 'Commercial Renovation',
          property_type: 'Restaurant',
          project_location: 'Abilene, TX',
          budget_range: '$50,000',
          timeline: 'Within 30 days',
          scope_description: 'Restaurant build-out demo test',
        },
        summary: 'Test email from Apps Script — if you see this, Gmail works.',
      },
    },
  };
  var result = handleVapiWebhook(fakeBody);
  Logger.log(JSON.stringify(result));
}

/** Visiting the deployed /exec URL in a browser should show this. */
function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, email: OWNER_EMAIL, hint: 'POST Vapi end-of-call payloads here' }),
  ).setMimeType(ContentService.MimeType.JSON);
}

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

  var leadStatus = structured.lead_status || 'Needs Review';
  var textBody = formatEmailBody(structured, summary, leadStatus);
  var htmlBody = formatEmailHtml(structured, summary, leadStatus, call);

  GmailApp.sendEmail(OWNER_EMAIL, emailSubject(structured, leadStatus), textBody, {
    htmlBody: htmlBody,
  });

  return {
    ok: true,
    emailTo: OWNER_EMAIL,
    emailSent: true,
    leadStatus: leadStatus,
  };
}

function emailSubject(structured, leadStatus) {
  var name = structured.full_name || 'Unknown caller';
  return '[Southpark Demo] ' + leadStatus + ' — ' + name;
}

function formatEmailBody(structured, summary, leadStatus) {
  return [
    'Southpark demo — call intake summary',
    '',
    'Status: ' + leadStatus,
    'Caller type: ' + (structured.caller_type || 'Unknown'),
    'Name: ' + (structured.full_name || 'Unknown'),
    'Phone: ' + (structured.phone || 'Unknown'),
    'Email: ' + (structured.email || 'Unknown'),
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
