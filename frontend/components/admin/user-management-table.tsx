"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { AdminUser } from "@/types";
import { UserManagementModal } from "@/components/admin/user-management-modal";

export function UserManagementTable({ users, currentUserId }: { users: AdminUser[]; currentUserId: string }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [updates, setUpdates] = useState<Record<string, AdminUser>>({});
  const [removed, setRemoved] = useState<string[]>([]);
  const currentUsers = users.filter(user => !removed.includes(user.id)).map(user => updates[user.id] ?? user);
  const visible = currentUsers.filter(user => `${user.displayName ?? ""} ${user.email} ${user.telephone ?? ""} ${user.role}`.toLowerCase().includes(query.trim().toLowerCase()));
  const role = (user: AdminUser) => <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${user.role === "ADMIN" ? "bg-majorelle-50 text-majorelle-700" : "bg-olive-50 text-olive-700"}`}>{user.role === "ADMIN" ? "Admin" : "Client"}</span>;
  return <section className="overflow-hidden rounded-[2rem] border border-sand-200 bg-sand-50 shadow-card" aria-label="Registered users">
    <header className="flex flex-col justify-between gap-4 border-b border-sand-200 p-5 sm:flex-row sm:items-center sm:p-6"><div><p className="text-sm font-bold text-ink">{visible.length} of {currentUsers.length} registered users</p><p className="mt-1 text-xs text-sand-700">Select an account to view details and manage access.</p></div><label className="flex items-center gap-2 rounded-full border border-sand-300 bg-white px-4 py-2.5"><Search className="size-4 shrink-0 text-sand-600" /><input aria-label="Search users" placeholder="Name, email, phone or role" value={query} onChange={event => setQuery(event.target.value)} className="w-full min-w-0 bg-transparent text-sm outline-none" /></label></header>
    <table className="hidden w-full table-fixed text-left md:table"><caption className="sr-only">Select a user to view profile and manage their role</caption><thead className="bg-sand-100 text-xs uppercase tracking-widest text-sand-700"><tr>{["Name", "Email", "Telephone", "Role"].map(label => <th key={label} className="p-5">{label}</th>)}</tr></thead><tbody className="divide-y divide-sand-200">{visible.map(user => <tr key={user.id} onClick={() => setSelected(user)} className="cursor-pointer hover:bg-white"><td className="break-words p-5 text-sm font-bold text-ink"><button type="button" aria-haspopup="dialog" onClick={() => setSelected(user)} className="text-left text-majorelle-700 underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-majorelle-500">{user.displayName || "Name not provided"}<span className="mt-1 block text-xs font-normal text-sand-700">View account →</span></button></td><td className="break-all p-5 text-sm text-sand-800">{user.email}</td><td className="break-words p-5 text-sm text-sand-800">{user.telephone || "Not provided"}</td><td className="p-5">{role(user)}</td></tr>)}</tbody></table>
    <div className="divide-y divide-sand-200 md:hidden">{visible.map(user => <button type="button" key={user.id} aria-haspopup="dialog" onClick={() => setSelected(user)} className="block w-full p-5 text-left hover:bg-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-majorelle-500"><span className="flex items-start justify-between gap-3"><span className="font-bold text-ink">{user.displayName || "Name not provided"}</span>{role(user)}</span><span className="mt-3 block break-all text-sm text-sand-700">{user.email}</span><span className="mt-2 block text-sm text-sand-700">{user.telephone || "Telephone not provided"}</span><span className="mt-3 block text-xs font-bold text-majorelle-700">View account →</span></button>)}</div>
    {visible.length === 0 && <p role="status" className="p-10 text-center text-sm text-sand-700">No users match this search.</p>}
    {selected && <UserManagementModal key={selected.id} initialUser={selected} currentUserId={currentUserId}
      onClose={() => setSelected(null)} onUpdated={user => setUpdates(previous => ({ ...previous, [user.id]: user }))}
      onRemoved={id => setRemoved(previous => [...previous, id])} />}
  </section>;
}
