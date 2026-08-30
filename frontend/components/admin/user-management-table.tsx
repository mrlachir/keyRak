"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { AdminUser } from "@/types";

export function UserManagementTable({ users }: { users: AdminUser[] }) {
  const [query, setQuery] = useState("");
  const visible = users.filter(user => `${user.displayName ?? ""} ${user.email} ${user.telephone ?? ""} ${user.role}`.toLowerCase().includes(query.trim().toLowerCase()));
  const role = (user: AdminUser) => <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${user.role === "ADMIN" ? "bg-majorelle-50 text-majorelle-700" : "bg-olive-50 text-olive-700"}`}>{user.role === "ADMIN" ? "Admin" : "Client"}</span>;
  return <section className="overflow-hidden rounded-[2rem] border border-sand-200 bg-sand-50 shadow-card" aria-label="Registered users">
    <header className="flex flex-col justify-between gap-4 border-b border-sand-200 p-5 sm:flex-row sm:items-center sm:p-6"><p className="text-sm font-bold text-ink">{visible.length} of {users.length} registered users</p><label className="flex items-center gap-2 rounded-full border border-sand-300 bg-white px-4 py-2.5"><Search className="size-4 shrink-0 text-sand-600" /><input aria-label="Search users" placeholder="Name, email, phone or role" value={query} onChange={event => setQuery(event.target.value)} className="w-full min-w-0 bg-transparent text-sm outline-none" /></label></header>
    <table className="hidden w-full table-fixed text-left md:table"><caption className="sr-only">Registered user names, email addresses, phone numbers, and roles</caption><thead className="bg-sand-100 text-xs uppercase tracking-widest text-sand-700"><tr>{["Name", "Email", "Telephone", "Role"].map(label => <th key={label} className="p-5">{label}</th>)}</tr></thead><tbody className="divide-y divide-sand-200">{visible.map(user => <tr key={user.id} className="hover:bg-white"><td className="break-words p-5 text-sm font-bold text-ink">{user.displayName || "Name not provided"}</td><td className="break-all p-5 text-sm text-sand-800">{user.email}</td><td className="break-words p-5 text-sm text-sand-800">{user.telephone || "Not provided"}</td><td className="p-5">{role(user)}</td></tr>)}</tbody></table>
    <div className="divide-y divide-sand-200 md:hidden">{visible.map(user => <article key={user.id} className="p-5"><div className="flex items-start justify-between gap-3"><h2 className="font-bold text-ink">{user.displayName || "Name not provided"}</h2>{role(user)}</div><p className="mt-3 break-all text-sm text-sand-700">{user.email}</p><p className="mt-2 text-sm text-sand-700">{user.telephone || "Telephone not provided"}</p></article>)}</div>
    {visible.length === 0 && <p role="status" className="p-10 text-center text-sm text-sand-700">No users match this search.</p>}
  </section>;
}
