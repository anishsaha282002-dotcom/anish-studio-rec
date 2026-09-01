import { describe, expect, it } from "vitest";
import {
  formatEnvChecklist,
  getEnvChecklist,
  loadEnv,
} from "./env.js";

describe("loadEnv", () => {
  it("parses defaults when vars are absent", () => {
    const env = loadEnv({});
    expect(env.DRY_RUN).toBe(true);
    expect(env.TICK_INTERVAL_MS).toBe(60_000);
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.HELIUS_API_KEY).toBe("");
  });

  it("parses DRY_RUN=false", () => {
    const env = loadEnv({ DRY_RUN: "false" });
    expect(env.DRY_RUN).toBe(false);
  });

  it("rejects invalid TICK_INTERVAL_MS", () => {
    expect(() => loadEnv({ TICK_INTERVAL_MS: "0" })).toThrow();
  });
});

describe("getEnvChecklist", () => {
  it("marks empty keys as not configured", () => {
    const env = loadEnv({});
    const checklist = getEnvChecklist(env);
    const helius = checklist.find((c) => c.key === "HELIUS_API_KEY");
    expect(helius?.configured).toBe(false);
  });

  it("marks populated keys as configured", () => {
    const env = loadEnv({ HELIUS_API_KEY: "test-key" });
    const checklist = getEnvChecklist(env);
    const helius = checklist.find((c) => c.key === "HELIUS_API_KEY");
    expect(helius?.configured).toBe(true);
  });

  it("formats checklist for logging", () => {
    const env = loadEnv({});
    const formatted = formatEnvChecklist(getEnvChecklist(env));
    expect(formatted).toContain("HELIUS_API_KEY");
    expect(formatted).toContain("✗ missing");
  });
});
