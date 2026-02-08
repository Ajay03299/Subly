"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import type { Contact } from "@/lib/types/users";

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    a1: "",
    a2: "",
    a3: "",
  });

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/contacts/${encodeURIComponent(id)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error || "Failed to load contact");
      setLoading(false);
      return;
    }
    const c = data.contact as Contact & Record<string, unknown>;
    setContact(c as Contact);
    setForm({
      name: c.name || "",
      email: c.email || "",
      phone: (c.phone as string) || "",
      a1: (c.addressLine1 as string) || "",
      a2: (c.addressLine2 as string) || "",
      a3: (c.addressLine3 as string) || "",
    });
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save() {
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      addressLine1: form.a1,
      addressLine2: form.a2,
      addressLine3: form.a3,
    };

    const res = await fetch(`/api/contacts/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error || "Failed to save contact");
      return;
    }
    await load();
  }

  async function remove() {
    if (!confirm("Delete this contact?")) return;
    const res = await fetch(`/api/contacts/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error || "Failed to delete contact");
      return;
    }
    router.push("/contacts");
  }

  const activeSubscriptionCount = useMemo(() => {
    // Hook later when subscriptions exist in API.
    // For now return 0 to keep UI stable.
    return 0;
  }, []);

  return (
    <AppShell activeHrefStartsWith="/users">
      <div className="p-6">
        {/* Toolbar row like mock */}
        <div className="flex items-center gap-3 mb-6">
          <button
            className="border rounded-lg px-6 py-2 text-sm"
            onClick={() => router.push("/contacts/new")}
          >
            New
          </button>
          <button
            className="border rounded-lg px-3 py-2 text-sm"
            onClick={remove}
            title="Delete"
          >
            🗑️
          </button>
          <button
            className="border rounded-lg px-3 py-2 text-sm"
            onClick={save}
            title="Save"
          >
            💾
          </button>

          <div className="flex-1" />

          <button
            className="border rounded-lg px-10 py-2 text-sm font-semibold"
            onClick={() => router.push(`/subscriptions?contactId=${encodeURIComponent(id)}`)}
          >
            Subscription
          </button>
        </div>

        {loading ? (
          <div className="text-sm">Loading…</div>
        ) : !contact ? (
          <div className="text-sm opacity-70">Contact not found.</div>
        ) : (
          <div className="grid grid-cols-12 gap-10">
            {/* Left: fields */}
            <div className="col-span-7">
              <div className="space-y-10">
                <BigField
                  label="Name"
                  value={form.name}
                  onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                />
                <BigField
                  label="Email"
                  value={form.email}
                  onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                />
                <BigField
                  label="Phone number"
                  value={form.phone}
                  onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                />

                <div>
                  <div className="text-xl font-semibold mb-4">Address</div>
                  <div className="space-y-6">
                    <Line value={form.a1} onChange={(v) => setForm((f) => ({ ...f, a1: v }))} />
                    <Line value={form.a2} onChange={(v) => setForm((f) => ({ ...f, a2: v }))} />
                    <Line value={form.a3} onChange={(v) => setForm((f) => ({ ...f, a3: v }))} />
                  </div>
                </div>

                <div className="text-xs opacity-70">
                  ContactID: <span className="font-mono">{contact.id}</span>
                </div>

                <button className="underline text-sm" onClick={() => router.push("/contacts")}>
                  ← Back
                </button>
              </div>
            </div>

            {/* Right: subscription count box like mock */}
            <div className="col-span-5">
              <div className="text-sm mb-3 opacity-70">
                Active subscriptions for this contact
              </div>
              <button
                className="w-full border rounded-xl p-4 text-left hover:bg-gray-50"
                onClick={() => router.push(`/subscriptions?contactId=${encodeURIComponent(id)}`)}
              >
                <div className="text-3xl font-bold">{activeSubscriptionCount}</div>
                <div className="text-sm opacity-70 mt-1">
                  Click to view subscriptions list
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function BigField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-4xl font-semibold mb-4">{label}</div>
      <input
        className="w-full border-b outline-none text-lg py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Line({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      className="w-3/4 border-b outline-none text-lg py-2"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

