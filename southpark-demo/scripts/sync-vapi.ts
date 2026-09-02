#!/usr/bin/env npx tsx
/**
 * Verify demo line + push Southpark assistant prompt, keyterms, and phone assignment.
 *
 * Usage:
 *   VAPI_API_KEY=your-key npx tsx scripts/sync-vapi.ts
 *   VAPI_API_KEY=your-key WEBHOOK_URL=https://.../exec npx tsx scripts/sync-vapi.ts
 */
import 'dotenv/config';
import { loadConfig } from '../src/config.js';
import { buildVapiAssistantPayload } from '../src/vapi/prompt.js';

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID ?? 'd9e37613-ed22-47c7-bae3-1a104a246954';
const PHONE_ID = process.env.VAPI_PHONE_ID ?? 'e30a70c5-1db3-43ab-8434-55367feb332f';
const WEBHOOK_URL = process.env.WEBHOOK_URL;

async function vapiGet(path: string) {
  const response = await fetch(`https://api.vapi.ai${path}`, {
    headers: { Authorization: `Bearer ${VAPI_API_KEY}` },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`GET ${path} (${response.status}): ${text}`);
  return JSON.parse(text);
}

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
  if (!response.ok) throw new Error(`PATCH ${path} (${response.status}): ${text}`);
  return text ? JSON.parse(text) : {};
}

async function main() {
  if (!VAPI_API_KEY) {
    console.error('Missing VAPI_API_KEY');
    process.exit(1);
  }

  const config = loadConfig();
  const payload = buildVapiAssistantPayload(config);

  console.log('=== Before ===');
  const phoneBefore = await vapiGet(`/phone-number/${PHONE_ID}`);
  const assistantBefore = await vapiGet(`/assistant/${ASSISTANT_ID}`);
  console.log('Phone:', phoneBefore.number, '→ assistantId:', phoneBefore.assistantId);
  console.log('Assistant name:', assistantBefore.name);
  console.log('First message:', assistantBefore.firstMessage?.slice(0, 80) + '...');
  console.log('Keyterms count:', assistantBefore.transcriber?.keyterm?.length ?? 0);

  const phonePatch: Record<string, unknown> = { assistantId: ASSISTANT_ID };
  if (WEBHOOK_URL) phonePatch.serverUrl = WEBHOOK_URL;

  console.log('\n=== Patching phone → Southpark assistant ===');
  const phone = await vapiPatch(`/phone-number/${PHONE_ID}`, phonePatch);
  console.log('Phone OK:', phone.number, '→', phone.assistantId);

  const assistantPatch: Record<string, unknown> = {
    name: payload.name,
    firstMessage: payload.firstMessage,
    endCallPhrases: payload.endCallPhrases,
    transcriber: payload.transcriber,
    model: payload.model,
    voice: payload.voice,
    analysisPlan: payload.analysisPlan,
  };
  if (WEBHOOK_URL) {
    assistantPatch.server = { url: WEBHOOK_URL };
    assistantPatch.serverMessages = ['end-of-call-report'];
  }

  console.log('\n=== Patching assistant (prompt + keyterms) ===');
  const assistant = await vapiPatch(`/assistant/${ASSISTANT_ID}`, assistantPatch);
  console.log('Assistant OK:', assistant.name);
  console.log('Keyterms:', assistant.transcriber?.keyterm?.length ?? 0);
  console.log('End-call phrases:', assistant.endCallPhrases?.length ?? 0);

  if (phone.assistantId !== ASSISTANT_ID) {
    console.error('\n⚠️  Phone still not on Southpark assistant!');
    process.exit(1);
  }

  console.log('\n✅ Demo line +1 (682) 727-3062 is on Southpark Investments intake.');
  console.log('Business:', config.businessName);
  if (WEBHOOK_URL) console.log('Webhook:', WEBHOOK_URL);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
