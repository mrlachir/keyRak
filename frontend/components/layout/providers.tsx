"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { WishlistProvider } from "@/components/wishlist/wishlist-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <WishlistProvider>{children}</WishlistProvider>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast: "!rounded-2xl !border-sand-200 !bg-sand-50 !font-sans !text-ink !shadow-float",
            description: "!text-sand-700",
          },
        }}
      />
    </SessionProvider>
  );
}
