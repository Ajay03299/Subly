import { NextRequest, NextResponse } from "next/server";
import { createUser, listUsers } from "@/lib/store/memory";
import { getCurrentRole } from "@/lib/auth/currentUser";
import type { Role } from "@/lib/types/users";

// List users: ADMIN + INTERNAL allowed
export async function GET() {
  const role = getCurrentRole();
  if (role !== "ADMIN" && role !== "INTERNAL") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ users: listUsers() }, { status: 200 });
}

// Create user: only ADMIN can create, and only ADMIN can create INTERNAL users (spec rule)
export async function POST(req: NextRequest) {
  const role = getCurrentRole();
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "only admin can create users" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "").trim();
  const newRole = String(body?.role || "USER").toUpperCase() as Role;

  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });
  if (!["INTERNAL", "USER"].includes(newRole)) {
    return NextResponse.json({ error: "invalid role (use INTERNAL or USER)" }, { status: 400 });
  }

  const user = createUser(email, newRole);
  return NextResponse.json({ user }, { status: 201 });
}

