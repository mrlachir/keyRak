"use client";

import { Link2, Upload } from "lucide-react";
import { useId } from "react";

export function PropertyMediaInput({ label, accept, hint, files, urls, disabled, onFilesChange, onUrlsChange }: {
  label: string; accept: string; hint: string; files: File[]; urls: string; disabled: boolean;
  onFilesChange: (files: File[]) => void; onUrlsChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <fieldset disabled={disabled} className="min-w-0 rounded-2xl border border-sand-200 bg-white p-4 disabled:opacity-60">
      <legend className="px-1 text-sm font-bold text-ink">{label}</legend>
      <p id={`${id}-hint`} className="text-xs leading-5 text-sand-600">{hint}</p>
      <label className="mt-3 block text-xs font-bold text-sand-800">
        <span className="flex items-center gap-1.5"><Upload className="size-3.5" aria-hidden="true" /> Upload files</span>
        <input type="file" accept={accept} multiple aria-describedby={`${id}-hint`} onChange={event => onFilesChange(Array.from(event.target.files ?? []))} className="mt-2 block w-full text-xs text-sand-700 file:mr-2 file:rounded-full file:border-0 file:bg-sand-100 file:px-3 file:py-2 file:font-bold file:text-sand-800" />
      </label>
      {files.length > 0 && <p className="mt-2 break-words text-xs font-semibold text-olive-700">{files.length} file{files.length === 1 ? "" : "s"} selected · {files.map(file => file.name).join(", ")}</p>}
      <label className="mt-4 block text-xs font-bold text-sand-800">
        <span className="flex items-center gap-1.5"><Link2 className="size-3.5" aria-hidden="true" /> Or paste direct links</span>
        <textarea value={urls} onChange={event => onUrlsChange(event.target.value)} rows={2} placeholder="https://example.com/media — one URL per line" className="mt-2 w-full resize-y rounded-xl border border-sand-300 bg-sand-50 px-3 py-2.5 text-sm font-medium leading-6 text-ink outline-none focus:border-majorelle-400 focus:ring-2 focus:ring-majorelle-100" />
      </label>
    </fieldset>
  );
}
