import { NextRequest, NextResponse } from "next/server";
import { createContact, listContacts } from "@/lib/store/memory";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q") || "";
  return NextResponse.json({ contacts: listContacts(q) }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim();

  if (!name || !email) {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 });
  }

  const contact = createContact({
    name,
    email,
    phone: body?.phone || null,
    company: body?.company || null,
    tags: Array.isArray(body?.tags) ? body.tags : [],
  });

  return NextResponse.json({ contact }, { status: 201 });
}


