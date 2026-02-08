import { readFileSync, existsSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    const logFile = join(process.cwd(), ".cron-logs", "invoices.json");

    if (!existsSync(logFile)) {
      return Response.json({
        logs: [],
        message: "No logs yet. Run /api/test/trigger-renewal to trigger the job.",
      });
    }

    const content = readFileSync(logFile, "utf-8").trim();
    
    // Handle empty file
    if (!content) {
      return Response.json({
        logs: [],
        message: "Log file is empty.",
      });
    }

    try {
      const logs = JSON.parse(content);
      return Response.json({ logs, count: Array.isArray(logs) ? logs.length : 0 });
    } catch (parseError) {
      return Response.json({
        logs: [],
        error: "Log file contains invalid JSON",
        rawContent: content.substring(0, 200), // Show first 200 chars for debugging
      });
    }
  } catch (error) {
    console.error("[logs] Error reading logs:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to read logs",
      },
      { status: 500 }
    );
  }
}
