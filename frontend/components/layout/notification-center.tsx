"use client";

import { Bell, Check, CheckCheck, LoaderCircle, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { getNotificationsAction, markAllNotificationsReadAction, markNotificationReadAction } from "@/app/actions/collections";
import type { NotificationInbox } from "@/types";

export function NotificationCenter() {
  const { data: session, status } = useSession();
  if (status !== "authenticated" || !session?.user) return null;
  return <AccountNotifications key={session.user.id} />;
}

function AccountNotifications() {
  const [open, setOpen] = useState(false);
  const [inbox, setInbox] = useState<NotificationInbox | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const bell = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const mounted = useRef(true);
  const revision = useRef(0);
  const mutating = useRef(false);
  const fetching = useRef(false);
  const panelId = useId();

  const refresh = useCallback((): Promise<void> => {
    if (mutating.current || fetching.current) return Promise.resolve();
    fetching.current = true;
    const request = ++revision.current;
    return getNotificationsAction().then((result) => {
      if (!mounted.current || request !== revision.current) return;
      if (result.ok) {
        setInbox(result.data);
        setError(null);
      } else setError(result.message);
    }).catch(() => {
      if (mounted.current && request === revision.current) setError("Notifications could not be loaded. Please retry.");
    }).finally(() => {
      fetching.current = false;
      if (mounted.current && request === revision.current) setLoading(false);
    });
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const onFocus = () => { void refresh(); };
    const poll = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 30_000);
    window.addEventListener("focus", onFocus);
    return () => {
      mounted.current = false;
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); bell.current?.focus(); }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markRead = async (id?: string) => {
    if (mutating.current) return;
    mutating.current = true;
    revision.current++;
    setPending(id ?? "all");
    try {
      const result = id ? await markNotificationReadAction(id) : await markAllNotificationsReadAction();
      if (!mounted.current) return;
      if (!result.ok) { toast.error(result.message); return; }
      setInbox((current) => current ? {
        unreadCount: id ? Math.max(0, current.unreadCount - 1) : 0,
        notifications: id ? current.notifications.filter((item) => item.id !== id) : [],
      } : current);
      if (!id) toast.success("All notifications marked as read");
    } catch {
      if (mounted.current) toast.error("The notification could not be updated. Please try again.");
    } finally {
      mutating.current = false;
      if (mounted.current) {
        setPending(null);
        await refresh();
      }
    }
  };

  const count = inbox?.unreadCount ?? 0;
  return (
    <div ref={root} className="relative" onBlur={(event) => {
      if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button ref={bell} type="button" aria-label={count ? `Notifications (${count} unread)` : "Notifications"}
        aria-expanded={open} aria-haspopup="dialog" aria-controls={open ? panelId : undefined}
        onClick={() => { setOpen(!open); if (!open) void refresh(); }}
        className="relative grid size-11 place-items-center rounded-full border border-sand-200 bg-sand-50 text-sand-800 transition hover:border-majorelle-200 hover:text-majorelle-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-majorelle-500">
        <Bell className="size-5" aria-hidden="true" />
        {count > 0 && <span className="absolute right-2 top-2 size-2.5 rounded-full border-2 border-sand-50 bg-red-500" aria-hidden="true" />}
      </button>
      {open && (
        <section id={panelId} role="dialog" aria-label="Unread notifications"
          className="fixed left-4 right-4 top-[4.5rem] z-10 overflow-hidden rounded-3xl border border-sand-200 bg-sand-50 shadow-float sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:w-96">
          <div className="flex items-center justify-between gap-3 border-b border-sand-200 px-5 py-4">
            <div><h2 className="font-serif text-2xl font-semibold text-ink">Notifications</h2><p className="mt-0.5 text-xs text-sand-800" aria-live="polite">{loading ? "Checking your inbox…" : `${count} unread`}</p></div>
            <button ref={closeButton} type="button" onClick={() => { setOpen(false); bell.current?.focus(); }} aria-label="Close notifications" className="grid size-9 place-items-center rounded-full text-sand-700 hover:bg-sand-200 focus-visible:ring-2 focus-visible:ring-majorelle-500"><X className="size-4" /></button>
          </div>
          {error && <div role="alert" className="border-b border-sand-200 bg-terracotta-50 px-5 py-3 text-sm text-terracotta-800">
            <p>{error}</p><button type="button" onClick={() => { setLoading(true); void refresh(); }} disabled={loading} className="mt-2 font-bold underline underline-offset-4 disabled:opacity-50">{loading ? "Retrying…" : "Retry"}</button>
          </div>}
          {loading && !inbox ? <div className="flex items-center justify-center gap-2 p-10 text-sm text-sand-800" role="status"><LoaderCircle className="size-5 animate-spin" /> Loading notifications</div>
            : inbox?.notifications.length ? (
              <>
                <ul className="max-h-[min(55vh,24rem)] divide-y divide-sand-200 overflow-y-auto overscroll-contain">
                  {inbox.notifications.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 px-5 py-4">
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-majorelle-50 text-majorelle-600"><Bell className="size-4" aria-hidden="true" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold leading-6 text-ink">{item.message}</p>
                        <time dateTime={item.createdAt} className="mt-1 block text-xs text-sand-700">{new Date(item.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
                        {/* The notification query avoids a hash-only jump leaving stale booking status on /profile. */}
                        {item.targetUrl?.startsWith("/") && !item.targetUrl.startsWith("//") && <a href={item.targetUrl.startsWith("/profile#") ? item.targetUrl.replace("/profile#", `/profile?notification=${encodeURIComponent(item.id)}#`) : item.targetUrl} onClick={() => setOpen(false)} className="mr-4 mt-3 inline-flex min-h-8 items-center text-xs font-bold text-majorelle-700 underline underline-offset-4">View details</a>}
                        <button type="button" disabled={!!pending} onClick={() => { void markRead(item.id); }} className="mt-3 inline-flex min-h-8 items-center gap-1.5 text-xs font-bold text-majorelle-700 hover:underline focus-visible:ring-2 focus-visible:ring-majorelle-500 disabled:opacity-50">
                          {pending === item.id ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" aria-hidden="true" />} Mark as read
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-sand-200 bg-sand-100/60 px-5 py-3">
                  {count > inbox.notifications.length && <p className="mb-2 text-xs text-sand-800">Showing the latest {inbox.notifications.length} of {count}. Mark items read to see older alerts.</p>}
                  <button type="button" disabled={!!pending} onClick={() => { void markRead(); }} className="inline-flex min-h-8 items-center gap-2 text-sm font-bold text-majorelle-700 hover:underline disabled:opacity-50">
                    {pending === "all" ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCheck className="size-4" aria-hidden="true" />} Mark all as read
                  </button>
                </div>
              </>
            ) : !error && <div className="px-7 py-10 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-olive-50 text-olive-600"><CheckCheck className="size-6" aria-hidden="true" /></span><p className="mt-4 text-sm font-bold text-ink">You’re all caught up.</p><p className="mt-2 text-xs leading-6 text-sand-800">New notifications will appear here.</p></div>}
        </section>
      )}
    </div>
  );
}
