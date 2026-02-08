import { startSubscriptionRenewalCron } from "@/lib/cron/subscription-renewal";

// Initialize cron on server startup
console.log("[instrumentation] Initializing cron jobs...");
startSubscriptionRenewalCron();

export async function register() {
  console.log("[instrumentation] Register called");
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[instrumentation] Starting subscription renewal cron...");
    startSubscriptionRenewalCron();
  }
}
