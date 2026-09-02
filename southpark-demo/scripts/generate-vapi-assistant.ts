#!/usr/bin/env tsx
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { buildVapiAssistantPayload } from '../src/vapi/prompt.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = loadConfig();

const payload = buildVapiAssistantPayload(config);
writeFileSync(
  resolve(__dirname, '../config/vapi-assistant.payload.json'),
  JSON.stringify(payload, null, 2),
);
console.log('Wrote config/vapi-assistant.payload.json');
