"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
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
