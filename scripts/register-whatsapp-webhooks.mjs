#!/usr/bin/env node
/**
 * register-whatsapp-webhooks.mjs
 *
 * Registers (or updates) the Evolution API webhook URL for every tenant that
 * already has a WhatsApp instance, so that connection state changes are
 * propagated to the app automatically.
 *
 * Usage:
 *   node scripts/register-whatsapp-webhooks.mjs
 *
 * Required environment variables (loaded from .env.local):
 *   NEXT_PUBLIC_APP_URL     – e.g. https://pododesk.com.br
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   EVOLUTION_API_URL
 *   EVOLUTION_API_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// Load .env.local manually (no dotenv dependency required)
// ---------------------------------------------------------------------------
function loadEnvLocal() {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed
        .slice(eqIdx + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // .env.local not found — rely on process.env already being set
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
  "https://pododesk.com.br";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "❌  NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
  );
  process.exit(1);
}

if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
  console.error("❌  EVOLUTION_API_URL and EVOLUTION_API_KEY are required.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const webhookUrl = `${APP_URL}/api/whatsapp/webhook`;

console.log(`\nWebhook URL: ${webhookUrl}\n`);

const { data: tenants, error } = await supabase
  .from("tenants")
  .select("id, name, evolution_instance_name, whatsapp_status")
  .not("evolution_instance_name", "is", null);

if (error) {
  console.error("❌  Failed to fetch tenants:", error.message);
  process.exit(1);
}

if (!tenants || tenants.length === 0) {
  console.log("ℹ️  No tenants with WhatsApp instances found.");
  process.exit(0);
}

console.log(`Found ${tenants.length} tenant(s) with WhatsApp instances.\n`);

let ok = 0;
let failed = 0;

for (const tenant of tenants) {
  const instance = tenant.evolution_instance_name;
  process.stdout.write(`  ${tenant.name} (${instance}) … `);

  try {
    const res = await fetch(
      `${EVOLUTION_API_URL}/webhook/set/${encodeURIComponent(instance)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          url: webhookUrl,
          byEvents: true,
          base64: false,
          events: ["CONNECTION_UPDATE"],
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    console.log("✅");
    ok++;
  } catch (err) {
    console.log(`❌  ${err.message}`);
    failed++;
  }
}

console.log(`\nDone: ${ok} succeeded, ${failed} failed.\n`);
