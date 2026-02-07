import { NextRequest, NextResponse } from "next/server";
import { memory } from "@/lib/store/memory";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const contact = memory.contacts.get(params.id) || null;
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  return NextResponse.json({ contact }, { status: 200 });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const existing = memory.contacts.get(params.id);
  if (!existing) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const updated = {
    ...existing,
    ...body,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  };

  memory.contacts.set(params.id, updated);
  return NextResponse.json({ contact: updated }, { status: 200 });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const existed = memory.contacts.delete(params.id);
  if (!existed) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
import { NextRequest, NextResponse } from "next/server";
import { deleteContact, updateContact } from "@/lib/store/memory";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const updated = updateContact(params.id, body);
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ contact: updated }, { status: 200 });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const ok = deleteContact(params.id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true }, { status: 200 });
}

