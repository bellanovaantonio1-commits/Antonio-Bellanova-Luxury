import * as dotenv from "dotenv";

dotenv.config();

const checks: { name: string; ok: boolean; hint?: string }[] = [];

function env(name: string, required = false) {
  const val = process.env[name]?.trim();
  checks.push({
    name,
    ok: !!val,
    hint: required && !val ? "Required for production" : undefined,
  });
}

env("DATABASE_URL");
env("APP_URL", true);
env("RESEND_API_KEY");
env("EMAIL_FROM");
env("STRIPE_SECRET_KEY");
env("STRIPE_WEBHOOK_SECRET");
env("GEMINI_API_KEY");

const failedRequired = checks.filter((c) => c.hint);
const optionalMissing = checks.filter((c) => !c.ok && !c.hint);

console.log("\n=== Deployment readiness ===\n");
for (const c of checks) {
  console.log(`${c.ok ? "✓" : "○"} ${c.name}${c.hint ? " (required)" : ""}`);
}

if (failedRequired.length) {
  console.log("\nMissing required:");
  failedRequired.forEach((c) => console.log(`  - ${c.name}`));
  process.exit(1);
}

if (optionalMissing.length) {
  console.log("\nOptional (recommended):");
  optionalMissing.forEach((c) => console.log(`  - ${c.name}`));
}

console.log("\nCore check passed.\n");
process.exit(0);
