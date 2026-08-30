"use client";

import { FileCheck2, LoaderCircle, ShieldCheck, Upload } from "lucide-react";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import { uploadProfileIdAction } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";

export function ProfileIdCard({ hasIdCard }: { hasIdCard: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [saved, setSaved] = useState(hasIdCard);
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !file) return;
    if (file.size > 8 * 1024 * 1024 || !(file.type.startsWith("image/") || file.type === "application/pdf")) {
      toast.error("Choose an image or PDF no larger than 8 MB.");
      return;
    }
    startTransition(async () => {
      const data = new FormData();
      data.set("idCard", file, file.name);
      const result = await uploadProfileIdAction(data);
      if (!result.ok) { toast.error(result.message); return; }
      setSaved(Boolean(result.data.idCardUrl));
      setFile(null);
      if (input.current) input.current.value = "";
      toast.success("ID document saved to your profile.");
    });
  }

  return (
    <section className="surface-card mt-6 rounded-[2rem] p-6 sm:p-7" aria-labelledby="profile-id-title">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="eyebrow">Private documents</p>
          <h2 id="profile-id-title" className="mt-2 font-serif text-3xl font-semibold text-ink">Your government ID</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-sand-700">Upload once and reuse it for future reservations. You can replace the document here whenever needed.</p>
        </div>
        <span className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ${saved ? "bg-olive-100 text-olive-800" : "bg-sand-200 text-sand-700"}`}>
          <FileCheck2 className="size-4" aria-hidden="true" />{saved ? "ID on file" : "Not uploaded yet"}
        </span>
      </div>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 rounded-2xl border border-dashed border-sand-300 bg-white p-4 text-sm font-bold text-ink">
          {saved ? "Replace government ID" : "Upload government ID"}
          <input ref={input} type="file" accept="image/*,application/pdf" required disabled={pending} onChange={event => setFile(event.target.files?.[0] ?? null)} className="mt-3 block w-full text-xs text-sand-700 file:mr-3 file:rounded-full file:border-0 file:bg-sand-100 file:px-4 file:py-2 file:font-bold file:text-sand-800" />
          <span className="mt-2 block text-xs font-medium text-sand-600">Image or PDF · Maximum 8 MB</span>
        </label>
        <Button type="submit" disabled={pending || !file} className="shrink-0">
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {pending ? "Saving…" : saved ? "Update ID" : "Save ID"}
        </Button>
      </form>
      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-sand-600"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-olive-700" aria-hidden="true" />Your document is stored privately and is never shown in public property media. Uploading saves the file; it is not an identity-verification check.</p>
    </section>
  );
}
