import type { ReactNode } from "react";

export function AdminSectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-sand-200 bg-sand-50 p-6 shadow-card">
      <p className="eyebrow">Admin workspace</p>
      <h2 className="mt-2 font-serif text-3xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-sand-700">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}
