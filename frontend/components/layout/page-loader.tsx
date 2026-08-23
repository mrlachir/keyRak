import { LoaderCircle } from "lucide-react";

export function PageLoader({ label = "Preparing your view…" }: { label?: string }) {
  return (
    <div className="zellige-overlay grid min-h-[55vh] place-items-center bg-hero-glow px-4" role="status">
      <div className="surface-card rounded-[2rem] px-8 py-7 text-center">
        <LoaderCircle className="mx-auto size-7 animate-spin text-majorelle-600" aria-hidden="true" />
        <p className="mt-4 text-sm font-bold text-sand-800">{label}</p>
      </div>
    </div>
  );
}
