import { cookies, headers } from "next/headers";
import type { Role } from "@/lib/types/users";

/**
 * Next.js 16 Route Handlers: headers() and cookies() are async.
 * Demo-safe RBAC:
 * - Allow header override: x-subly-role (ADMIN/INTERNAL/USER)
 * - Default ADMIN so you can proceed without full auth wiring
 */
export async function getCurrentRole(): Promise<Role> {
  const h = await headers();
  const override = h.get("x-subly-role") as Role | null;
  if (override === "ADMIN" || override === "INTERNAL" || override === "USER") return override;

  const c = await cookies();
  const token = c.get("subly_token")?.value;
  if (token) return "ADMIN";

  return "ADMIN";
}

