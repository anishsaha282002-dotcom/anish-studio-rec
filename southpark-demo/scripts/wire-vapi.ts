#!/usr/bin/env npx tsx
/**
 * Point Southpark Vapi assistant + phone to the webhook URL.
 *
 * Usage:
 *   VAPI_API_KEY=... WEBHOOK_URL=https://script.google.com/macros/s/.../exec npx tsx scripts/wire-vapi.ts
 */
import 'dotenv/config';

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID ?? 'd9e37613-ed22-47c7-bae3-1a104a246954';
const PHONE_ID = process.env.VAPI_PHONE_ID ?? 'e30a70c5-1db3-43ab-8434-55367feb332f';

async function vapiPatch(path: string, body: Record<string, unknown>) {
  const response = await fetch(`https://api.vapi.ai${path}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`PATCH ${path} failed (${response.status}): ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

async function vapiGet(path: string) {
  const response = await fetch(`https://api.vapi.ai${path}`, {
    headers: { Authorization: `Bearer ${VAPI_API_KEY}` },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`GET ${path} failed (${response.status}): ${text}`);
  }
  return JSON.parse(text);
}

async function main() {
  if (!VAPI_API_KEY) {
    console.error('Missing VAPI_API_KEY');
    process.exit(1);
  }
  if (!WEBHOOK_URL) {
    console.error('Missing WEBHOOK_URL (Apps Script /exec URL or Vercel webhook URL)');
    process.exit(1);
  }

  console.log('Current phone number:');
  console.log(JSON.stringify(await vapiGet(`/phone-number/${PHONE_ID}`), null, 2));

  console.log('\nPatching phone number server URL...');
  const phone = await vapiPatch(`/phone-number/${PHONE_ID}`, {
    assistantId: ASSISTANT_ID,
    serverUrl: WEBHOOK_URL,
  });
  console.log('Phone patched:', phone.number, '→ assistant', phone.assistantId);

  console.log('\nPatching assistant server URL...');
  const assistant = await vapiPatch(`/assistant/${ASSISTANT_ID}`, {
    server: {
      url: WEBHOOK_URL,
    },
  });
  console.log('Assistant patched:', assistant.name ?? assistant.id);

  console.log('\nDone. Webhook:', WEBHOOK_URL);
  console.log('Demo line: +1 (682) 727-3062');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
