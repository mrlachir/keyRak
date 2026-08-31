"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { FileSearch, LoaderCircle, ShieldCheck } from "lucide-react";
import { idCardPreviewPath } from "@/lib/user-management";

type Preview = { url: string; type: string };

export function SecureIdCard({ userId }: { userId: string }) {
  const [opened, setOpened] = useState(false);
  return <section className="rounded-2xl border border-sand-200 bg-white p-4" aria-label="Private government ID">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="size-5 text-olive-700" />Government ID</div>
      <button type="button" onClick={() => setOpened(value => !value)} className="rounded-full border border-sand-300 px-4 py-2 text-xs font-bold text-majorelle-700 hover:bg-majorelle-50 focus-visible:ring-2 focus-visible:ring-majorelle-500">{opened ? "Hide document" : "View private document"}</button>
    </div>
    <p className="mt-2 text-xs leading-5 text-sand-700">Private admin access. An uploaded file is not proof of identity verification.</p>
    {opened && <DocumentPreview key={userId} userId={userId} />}
  </section>;
}

function DocumentPreview({ userId }: { userId: string }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [failed, setFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    let disposed = false;
    async function load() {
      try {
        const response = await fetch(idCardPreviewPath(userId), { credentials: "same-origin", cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Document unavailable");
        const blob = await response.blob();
        if (disposed) return;
        if (!blob.size || (!blob.type.startsWith("image/") && blob.type !== "application/pdf")) throw new Error("Unsupported document");
        objectUrl = URL.createObjectURL(blob);
        setPreview({ url: objectUrl, type: blob.type });
      } catch { if (!disposed) setFailed(true); }
    }
    void load();
    return () => { disposed = true; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [userId]);

  if (failed) return <div role="status" className="mt-4 flex items-start gap-3 rounded-xl bg-sand-100 p-4 text-sm text-sand-800"><FileSearch className="size-5 shrink-0" /><p>Document not available. It may be missing, or you may no longer have access. Close and reopen to try again.</p></div>;
  if (!preview) return <p role="status" className="mt-4 flex items-center gap-2 text-sm text-sand-700"><LoaderCircle className="size-4 animate-spin" />Loading private document…</p>;
  return <div className="mt-4 space-y-3">
    {preview.type === "application/pdf"
      ? <iframe title="Government ID document" src={preview.url} className="h-96 w-full rounded-xl border border-sand-200" />
      : imageFailed ? <p role="status" className="rounded-xl bg-sand-100 p-4 text-sm text-sand-800">This image format cannot be previewed in your browser. You can download the document below.</p>
        : <img src={preview.url} alt="Private government ID" onError={() => setImageFailed(true)} className="max-h-96 w-full rounded-xl bg-sand-100 object-contain" />}
    <a href={preview.url} download={`identity-document.${preview.type === "application/pdf" ? "pdf" : preview.type.split("/")[1]}`} className="inline-flex text-sm font-bold text-majorelle-700 underline underline-offset-4">Download document</a>
  </div>;
}
