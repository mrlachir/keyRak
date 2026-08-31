"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { CalendarDays, LoaderCircle, Mail, Phone, Shield, Trash2, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { deleteUserAction, getAdminUserAction, updateUserRoleAction } from "@/app/actions/users";
import { SecureIdCard } from "@/components/admin/secure-id-card";
import { safeAvatarUrl } from "@/lib/user-management";
import type { AdminUser, UserRole } from "@/types";

export function UserManagementModal({ initialUser, currentUserId, onClose, onUpdated, onRemoved }: {
  initialUser: AdminUser;
  currentUserId: string;
  onClose: () => void;
  onUpdated: (user: AdminUser) => void;
  onRemoved: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  const [user, setUser] = useState(initialUser);
  const [role, setRole] = useState<UserRole>(initialUser.role);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const self = user.id === currentUserId;

  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    let disposed = false;
    getAdminUserAction(initialUser.id).then(result => {
      if (disposed) return;
      if (!result.ok) { setLoadError(result.message); return; }
      setUser(result.data);
      setRole(result.data.role);
      setReady(true);
    }).catch(() => { if (!disposed) setLoadError("User details could not be loaded. Please close and try again."); });
    return () => {
      disposed = true;
      element?.close();
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
    };
  }, [initialUser.id]);

  function saveRole() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateUserRoleAction(user.id, role);
        if (!result.ok) { setError(result.message); toast.error(result.message); return; }
        setUser(result.data);
        onUpdated(result.data);
        toast.success("Account role updated.");
      } catch { setError("The role could not be saved. Please try again."); }
    });
  }

  function removeUser() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteUserAction(user.id, confirmation);
        if (!result.ok) { setError(result.message); toast.error(result.message); return; }
        onRemoved(user.id);
        toast.success("User permanently removed.");
        onClose();
      } catch { setError("The user could not be removed. Please try again."); }
    });
  }

  return <dialog ref={dialog} aria-labelledby={heading}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}
    className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-[2rem] border border-sand-200 bg-sand-50 p-0 text-ink shadow-float backdrop:bg-ink/55 backdrop:backdrop-blur-sm">
    <div>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-sand-200 bg-sand-50 px-5 py-4 sm:px-7">
        <div><p className="eyebrow">Marketplace community</p><h2 id={heading} className="mt-1 font-serif text-3xl font-semibold">Account details</h2></div>
        <button type="button" autoFocus disabled={busy} onClick={onClose} aria-label="Close account details" className="grid size-10 shrink-0 place-items-center rounded-full border border-sand-300 hover:bg-sand-100 focus-visible:ring-2 focus-visible:ring-majorelle-500 disabled:opacity-50"><X className="size-5" /></button>
      </header>
      {loadError ? <p role="alert" className="m-6 rounded-2xl bg-sand-100 p-5 text-sm text-sand-800">{loadError}</p>
        : !ready ? <p role="status" className="flex items-center gap-3 p-8 text-sm text-sand-700"><LoaderCircle className="size-5 animate-spin" />Loading account details…</p>
        : <div className="space-y-6 p-5 sm:p-7">
          <div className="flex items-center gap-4">
            <UserAvatar key={user.avatarUrl} src={user.avatarUrl} name={user.displayName || user.email} />
            <div className="min-w-0"><h3 className="break-words font-serif text-2xl font-semibold">{user.displayName || "Name not provided"}</h3><span className="mt-2 inline-flex rounded-full bg-majorelle-50 px-3 py-1 text-xs font-bold text-majorelle-700">{user.role === "ADMIN" ? "Administrator" : "Client"}{self && " · You"}</span></div>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Detail label="Email" icon={<Mail className="size-4" />}><span className="break-all">{user.email}</span></Detail>
            <Detail label="Phone number" icon={<Phone className="size-4" />}>{user.telephone || "Not provided"}</Detail>
            <Detail label="Account created" icon={<CalendarDays className="size-4" />}>{new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(user.createdAt))}</Detail>
            <Detail label="User ID" icon={<UserRound className="size-4" />}><span className="break-all font-mono text-xs">{user.id}</span></Detail>
          </dl>
          {user.hasIdCard ? <SecureIdCard userId={user.id} /> : <p className="rounded-2xl border border-sand-200 p-4 text-sm text-sand-700">No government ID on file.</p>}
          <form onSubmit={event => { event.preventDefault(); if (!busy && role !== user.role && !self) saveRole(); }} className="rounded-2xl border border-sand-200 bg-white p-4">
            <label htmlFor={`${heading}-role`} className="flex items-center gap-2 text-sm font-bold"><Shield className="size-4 text-majorelle-600" />Account role</label>
            <p className="mt-2 text-xs leading-5 text-sand-700">Administrators can manage properties, reservations, accounts, and private ID documents.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <select id={`${heading}-role`} value={role} onChange={event => { setRole(event.target.value as UserRole); setConfirming(false); setError(null); }} disabled={busy || self}
                className="min-w-0 flex-1 rounded-xl border border-sand-300 bg-sand-50 px-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-majorelle-500 disabled:opacity-60">
                <option value="CLIENT">Client</option><option value="ADMIN">Administrator</option>
              </select>
              <button type="submit" disabled={busy || self || role === user.role} className="flex items-center justify-center gap-2 rounded-full bg-majorelle-600 px-5 py-3 text-sm font-bold text-white hover:bg-majorelle-700 disabled:cursor-not-allowed disabled:opacity-50">{busy && !confirming && <LoaderCircle className="size-4 animate-spin" />}Save role</button>
            </div>
            {self && <p className="mt-3 text-xs text-sand-700">Another administrator must change your role. Self-removal is disabled.</p>}
          </form>
          <section className="rounded-2xl border border-terracotta-200 bg-terracotta-50/50 p-4">
            <h3 className="text-sm font-bold text-terracotta-800">Remove account</h3>
            <p className="mt-2 text-xs leading-5 text-sand-800">Removal is permanent. The profile, private ID, reviews, saved properties, and notifications are deleted. Accounts with booking history cannot be removed.</p>
            {!confirming ? <button type="button" onClick={() => { setConfirming(true); setError(null); }} disabled={busy || self} className="mt-4 flex items-center gap-2 rounded-full border border-terracotta-300 bg-white px-4 py-2.5 text-sm font-bold text-terracotta-800 hover:bg-terracotta-50 disabled:opacity-50"><Trash2 className="size-4" />Remove client / user</button>
              : <form onSubmit={event => { event.preventDefault(); if (!busy && confirmation.trim().toLowerCase() === user.email.toLowerCase()) removeUser(); }} className="mt-4 space-y-3">
                <label htmlFor={`${heading}-confirmation`} className="block text-xs font-bold text-terracotta-800">Type {user.email} to confirm</label>
                <input id={`${heading}-confirmation`} type="email" value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} autoComplete="off" className="w-full rounded-xl border border-terracotta-300 bg-white px-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-terracotta-500" />
                <div className="flex flex-wrap gap-3"><button type="button" onClick={() => setConfirming(false)} disabled={busy} className="rounded-full border border-sand-300 bg-white px-4 py-2.5 text-sm font-bold">Keep account</button><button type="submit" disabled={busy || confirmation.trim().toLowerCase() !== user.email.toLowerCase()} className="flex items-center gap-2 rounded-full bg-terracotta-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy && <LoaderCircle className="size-4 animate-spin" />}Permanently remove</button></div>
              </form>}
          </section>
          {error && <p role="alert" className="rounded-xl border border-terracotta-200 bg-terracotta-50 p-4 text-sm text-terracotta-800">{error}</p>}
        </div>}
    </div>
  </dialog>;
}

function UserAvatar({ src, name }: { src?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const url = safeAvatarUrl(src);
  return <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-sand-200 bg-sand-100 text-terracotta-600">
    {url && !failed ? <img src={url} alt={`${name}'s profile`} referrerPolicy="no-referrer" onError={() => setFailed(true)} className="size-full object-cover" /> : <UserRound className="size-8" aria-label="Profile image unavailable" />}
  </div>;
}

function Detail({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="min-w-0 rounded-2xl bg-sand-100/70 p-4"><dt className="flex items-center gap-2 text-xs font-bold text-sand-700">{icon}{label}</dt><dd className="mt-2 text-sm font-semibold">{children}</dd></div>;
}
