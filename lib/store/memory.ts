import { AppUser, Contact, Role } from "@/lib/types/users";

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

type MemoryDB = {
  users: AppUser[];
  contacts: Contact[];
};

// Keep data across hot reload in dev
const g = globalThis as any;

function init(): MemoryDB {
  if (!g.__subly_memory_db) {
    const now = new Date().toISOString();
    g.__subly_memory_db = {
      users: [
        { id: uid("usr"), email: "admin@subly.dev", role: "ADMIN", verifiedAt: now, createdAt: now, phone: null, address: null },
        { id: uid("usr"), email: "ops@subly.dev", role: "INTERNAL", verifiedAt: now, createdAt: now, phone: null, address: null },
      ],
      contacts: [
        {
          id: uid("ctc"),
          name: "Demo Customer",
          email: "customer@demo.com",
          phone: "+91-99999-99999",
          company: "DemoCo",
          tags: ["trial", "priority"],
          createdAt: now,
          updatedAt: now,
        },
      ],
    } satisfies MemoryDB;
  }
  return g.__subly_memory_db as MemoryDB;
}

export const mem = init();

// USERS
export function listUsers() {
  return [...mem.users].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createUser(email: string, role: Role) {
  const now = new Date().toISOString();
  const user: AppUser = { id: uid("usr"), email, role, verifiedAt: null, createdAt: now };
  mem.users.unshift(user);
  return user;
}

// CONTACTS
export function listContacts(q?: string) {
  const all = [...mem.contacts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (!q) return all;

  const s = q.toLowerCase();
  return all.filter((c) =>
    [c.name, c.email, c.phone || "", c.company || "", (c.tags || []).join(" ")].some((x) =>
      x.toLowerCase().includes(s)
    )
  );
}

export function createContact(input: Omit<Contact, "id" | "createdAt" | "updatedAt">) {
  const now = new Date().toISOString();
  const contact: Contact = { ...input, id: uid("ctc"), createdAt: now, updatedAt: now };
  mem.contacts.unshift(contact);
  return contact;
}

export function updateContact(id: string, patch: Partial<Contact>) {
  const idx = mem.contacts.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  mem.contacts[idx] = { ...mem.contacts[idx], ...patch, updatedAt: new Date().toISOString() };
  return mem.contacts[idx];
}

export function deleteContact(id: string) {
  const before = mem.contacts.length;
  mem.contacts = mem.contacts.filter((c) => c.id !== id);
  return mem.contacts.length !== before;
}

