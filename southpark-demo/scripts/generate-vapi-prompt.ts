#!/usr/bin/env tsx
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { buildSystemPrompt, buildFirstMessage } from '../src/vapi/prompt.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = loadConfig();

const output = `# Generated Vapi System Prompt

Business: ${config.businessName}
Assistant: ${config.assistantName}

## First Message

${buildFirstMessage(config)}

## System Prompt

${buildSystemPrompt(config)}
`;

writeFileSync(resolve(__dirname, '../docs/vapi-system-prompt.md'), output);
console.log('Wrote docs/vapi-system-prompt.md');
