import { runSubscriptionRenewalJob } from "@/lib/cron/subscription-renewal";

export async function POST() {
  try {
    console.log("[test] Manually triggering subscription renewal job...");
    await runSubscriptionRenewalJob();
    return Response.json({
      success: true,
      message: "Subscription renewal job executed. Check .cron-logs/invoices.json for details.",
    });
  } catch (error) {
    console.error("[test] Error triggering renewal job:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
