import { NextRequest, NextResponse } from "next/server";
import { mem, updateContact, deleteContact } from "@/lib/store/memory";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const contact = mem.contacts.find((c) => c.id === params.id) || null;
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  return NextResponse.json({ contact }, { status: 200 });
}

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
