"use client";

import Image from "next/image";
import Link from "next/link";
import { Building2, LoaderCircle, LogOut, UserRound } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function AuthButton() {
  const { data: session, status } = useSession();
  const [authAction, setAuthAction] = useState<"signin" | "signout" | null>(null);

  const handleSignIn = async () => {
    if (authAction) return;
    setAuthAction("signin");
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      toast.error("Google sign-in could not be started. Please try again.");
      setAuthAction(null);
    }
  };

  const handleSignOut = async () => {
    if (authAction) return;
    setAuthAction("signout");
    try {
      await signOut({ callbackUrl: "/" });
    } catch {
      toast.error("Sign-out could not be completed. Please try again.");
      setAuthAction(null);
    }
  };

  if (status === "loading") {
    return <div className="h-11 w-32 animate-pulse rounded-full bg-sand-200" aria-label="Loading session" />;
  }

  if (!session?.user) {
    return (
      <Button onClick={handleSignIn} disabled={authAction === "signin"} className="px-4 sm:px-5">
        {authAction === "signin" ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <UserRound className="size-4" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">Continue with Google</span>
        <span className="sm:hidden">{authAction === "signin" ? "Opening…" : "Sign in"}</span>
      </Button>
    );
  }

  const initials = session.user.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-2">
      {session.user.role === "ADMIN" && (
        <Link
          href="/admin/dashboard"
          className="hidden min-h-10 items-center gap-2 rounded-full border border-sand-300 bg-sand-50 px-4 text-xs font-bold text-ink transition hover:border-terracotta-300 hover:text-terracotta-700 sm:inline-flex"
        >
          <Building2 className="size-4" aria-hidden="true" /> Admin
        </Link>
      )}
      <div className="flex items-center gap-2 rounded-full border border-sand-200 bg-sand-50 p-1 pl-1.5 shadow-sm">
        <Link
          href="/profile"
          className="grid size-9 place-items-center overflow-hidden rounded-full bg-terracotta-100 text-xs font-bold text-terracotta-800 ring-majorelle-500 focus-visible:outline-none focus-visible:ring-2"
          aria-label="Open your trips"
        >
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name ? `${session.user.name}'s avatar` : "User avatar"}
              width={36}
              height={36}
              className="size-9 object-cover"
            />
          ) : (
            initials ?? "U"
          )}
        </Link>
        <span className="hidden max-w-28 truncate text-sm font-semibold text-ink lg:block">
          {session.user.name ?? session.user.email}
        </span>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={authAction === "signout"}
          className="grid size-9 place-items-center rounded-full text-sand-700 transition hover:bg-sand-200 hover:text-terracotta-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-majorelle-500"
          aria-label="Sign out"
        >
          {authAction === "signout" ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <LogOut className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
