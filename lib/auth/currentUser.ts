import { cookies, headers } from "next/headers";
import type { Role } from "@/lib/types/users";

/**
 * Champion hackathon approach:
 * - If your auth module exists, wire this to /api/auth/me later.
 * - For now: allow "x-subly-role" header override for easy testing.
 */
export function getCurrentRole(): Role {
  const h = headers();
  const override = h.get("x-subly-role") as Role | null;
  if (override === "ADMIN" || override === "INTERNAL" || override === "USER") return override;

  // Optional cookie for later integration (safe even if not set)
  const token = cookies().get("subly_token")?.value;
  if (token) return "ADMIN"; // demo default; replace with jwtVerify later

  return "ADMIN"; // demo: keep admin so you can test module without auth blocking
}

