"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import type { Contact } from "@/lib/types/users";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    const url = q.trim()
      ? `/api/contacts?q=${encodeURIComponent(q.trim())}`
      : "/api/contacts";
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error || "Failed to load contacts");
      setLoading(false);
      return;
    }
    setContacts(data.contacts || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter((c) => {
      return (
        (c.name || "").toLowerCase().includes(query) ||
        (c.email || "").toLowerCase().includes(query) ||
        (c.phone || "").toLowerCase().includes(query)
      );
    });
  }, [contacts, q]);

  return (
    <AppShell activeHrefStartsWith="/users">
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Contacts</h1>
            <p className="text-sm opacity-80 mt-2">
              Contacts are linked to users (1 default contact per user later).
            </p>
          </div>

          <div className="flex-1" />

          <input
            className="border rounded-lg px-3 py-2 text-sm min-w-[260px]"
            placeholder="Search name / email / phone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="border rounded-lg px-3 py-2 text-sm" onClick={load}>
            Refresh
          </button>
        </div>

        <div className="mt-6 border rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-2 p-3 text-xs font-semibold border-b">
            <div className="col-span-4">Name</div>
            <div className="col-span-4">Email</div>
            <div className="col-span-2">Phone</div>
            <div className="col-span-2">Created</div>
          </div>

          {loading ? (
            <div className="p-4 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-sm opacity-70">No contacts found.</div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-12 gap-2 p-3 text-sm border-b"
              >
                <div className="col-span-4">
                  <Link className="underline" href={`/contacts/${c.id}`}>
                    {c.name || "(no name)"}
                  </Link>
                </div>
                <div className="col-span-4">{c.email || "-"}</div>
                <div className="col-span-2">{c.phone || "-"}</div>
                <div className="col-span-2">
                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "-"}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 text-sm">
          Go back to <Link className="underline" href="/users">Users</Link>
        </div>
      </div>
    </AppShell>
  );
}


