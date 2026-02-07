export type Role = "ADMIN" | "INTERNAL" | "USER";

export type AppUser = {
  id: string;
  email: string;
  role: Role;
  verifiedAt?: string | null;
  createdAt: string;
};

export type Contact = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};

