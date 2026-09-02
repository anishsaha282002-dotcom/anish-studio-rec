import express from 'express';
import pino from 'pino';
import { loadConfig } from './config.js';
import { normalizeLead } from './scoring/lead-scoring.js';
import { extractLeadReport, verifyVapiWebhookSecret } from './webhook/parse-vapi-payload.js';
import { processLeadIntake } from './pipeline/intake.js';

const log = pino({ name: 'southpark-demo' });
const config = loadConfig();

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    business: config.businessName,
    assistant: config.assistantName,
  });
});

app.post(config.webhookPath, async (req, res) => {
  try {
    const secretHeader = req.header('x-vapi-secret') ?? req.header('authorization');
    if (!verifyVapiWebhookSecret(secretHeader ?? undefined, config.vapi.webhookSecret)) {
      res.status(401).json({ error: 'Invalid webhook secret' });
      return;
    }

    const report = extractLeadReport(req.body);
    const lead = normalizeLead(report, config);
    const result = await processLeadIntake(lead, config);

    log.info(
      {
        callId: lead.call_id,
        leadStatus: lead.lead_status,
        airtableRecordId: result.airtableRecordId,
        smsSent: result.smsSent,
      },
      'Processed end-of-call intake',
    );

    res.json({ ok: true, result });
  } catch (error) {
    log.error({ err: error }, 'Webhook processing failed');
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.listen(config.port, () => {
  log.info(
    {
      port: config.port,
      webhookPath: config.webhookPath,
      business: config.businessName,
    },
    'Southpark lead capture webhook server listening',
  );
});
