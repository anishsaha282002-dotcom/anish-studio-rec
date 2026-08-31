import { config as loadDotenv } from "dotenv";
import {
  formatEnvChecklist,
  getEnvChecklist,
  loadEnv,
} from "./config/env.js";
import { createLogger } from "./lib/logger.js";

loadDotenv();

const env = loadEnv();
const log = createLogger(env);

log.info(
  {
    dryRun: env.DRY_RUN,
    tickIntervalMs: env.TICK_INTERVAL_MS,
    logLevel: env.LOG_LEVEL,
  },
  "Solana memecoin scanner starting (read-only mode)",
);

const checklist = getEnvChecklist(env);
log.info(formatEnvChecklist(checklist));

const missingRequired = checklist.filter((c) => c.required && !c.configured);
if (missingRequired.length > 0) {
  log.warn(
    { missing: missingRequired.map((c) => c.key) },
    "Some required API keys are not configured — pipeline will degrade gracefully",
  );
}

log.info("Step 1 scaffold loaded. Pipeline not yet implemented.");
