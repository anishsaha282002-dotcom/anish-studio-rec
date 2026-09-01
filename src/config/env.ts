import { z } from "zod";

const logLevelSchema = z.enum([
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
]);

export const envSchema = z.object({
  HELIUS_API_KEY: z.string().optional().default(""),
  BIRDEYE_API_KEY: z.string().optional().default(""),
  TELEGRAM_BOT_TOKEN: z.string().optional().default(""),
  TELEGRAM_CHAT_ID: z.string().optional().default(""),
  LOG_LEVEL: logLevelSchema.default("info"),
  TICK_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
  DRY_RUN: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(raw: Record<string, string | undefined> = process.env): Env {
  return envSchema.parse(raw);
}

export interface EnvChecklistItem {
  key: keyof Env;
  label: string;
  required: boolean;
  configured: boolean;
}

export function getEnvChecklist(env: Env): EnvChecklistItem[] {
  return [
    {
      key: "HELIUS_API_KEY",
      label: "Helius RPC API key",
      required: true,
      configured: env.HELIUS_API_KEY.length > 0,
    },
    {
      key: "BIRDEYE_API_KEY",
      label: "Birdeye API key",
      required: true,
      configured: env.BIRDEYE_API_KEY.length > 0,
    },
    {
      key: "TELEGRAM_BOT_TOKEN",
      label: "Telegram bot token (from @BotFather)",
      required: true,
      configured: env.TELEGRAM_BOT_TOKEN.length > 0,
    },
    {
      key: "TELEGRAM_CHAT_ID",
      label: "Telegram chat ID",
      required: true,
      configured: env.TELEGRAM_CHAT_ID.length > 0,
    },
  ];
}

export function formatEnvChecklist(items: EnvChecklistItem[]): string {
  const lines = items.map((item) => {
    const status = item.configured ? "✓ set" : "✗ missing";
    const req = item.required ? "required" : "optional";
    return `  ${item.key}: ${status} (${req}) — ${item.label}`;
  });
  return ["Environment checklist:", ...lines].join("\n");
}
