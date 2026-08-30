"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";

import { getWishlistIdsAction, setWishlistAction } from "@/app/actions/collections";

interface WishlistContextValue {
  ids: Set<string>;
  ready: boolean;
  loading: boolean;
  error: string | null;
  pending: Set<string>;
  toggle: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  // Reset private state immediately when the account changes, including logout.
  return (
    <AccountWishlist key={session?.user?.id ?? status} authenticated={status === "authenticated"} sessionLoading={status === "loading"}>
      {children}
    </AccountWishlist>
  );
}

function AccountWishlist({ children, authenticated, sessionLoading }: {
  children: React.ReactNode;
  authenticated: boolean;
  sessionLoading: boolean;
}) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(!authenticated && !sessionLoading);
  const [loading, setLoading] = useState(authenticated || sessionLoading);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const pendingRef = useRef(new Set<string>());
  const revision = useRef(0);
  const mounted = useRef(true);

  const refresh = useCallback((): Promise<void> => {
    if (!authenticated || pendingRef.current.size) return Promise.resolve();
    const request = ++revision.current;
    return getWishlistIdsAction().then((result) => {
      if (!mounted.current || request !== revision.current) return;
      if (result.ok) {
        setIds(new Set(result.data));
        setReady(true);
        setError(null);
      } else {
        setError(result.message);
      }
    }).catch(() => {
      if (mounted.current && request === revision.current) setError("Your wishlist could not be loaded. Please retry.");
    }).finally(() => {
      if (mounted.current && request === revision.current) setLoading(false);
    });
  }, [authenticated]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => {
      mounted.current = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const toggle = async (id: string) => {
    if (sessionLoading || pendingRef.current.has(id)) return;
    if (!authenticated) {
      try {
        await signIn("google", { callbackUrl: window.location.pathname + window.location.search });
      } catch {
        toast.error("Google sign-in could not be started. Please try again.");
      }
      return;
    }
    if (!ready || error) {
      setLoading(true);
      await refresh();
      return;
    }
    const save = !ids.has(id);
    revision.current++; // An older read must not undo a successful toggle.
    pendingRef.current.add(id);
    setPending(new Set(pendingRef.current));
    try {
      const result = await setWishlistAction(id, save);
      if (!mounted.current) return;
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setIds((current) => {
        const next = new Set(current);
        if (save) next.add(id); else next.delete(id);
        return next;
      });
      toast.success(save ? "Added to your wishlist" : "Removed from your wishlist");
    } catch {
      if (mounted.current) toast.error("Your wishlist could not be updated. Please try again.");
    } finally {
      pendingRef.current.delete(id);
      if (mounted.current) setPending(new Set(pendingRef.current));
    }
  };

  return (
    <WishlistContext.Provider value={{ ids, ready, loading, error, pending, toggle, refresh }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("Wishlist components must be inside WishlistProvider");
  return context;
}
