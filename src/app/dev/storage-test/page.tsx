"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/infrastructure/supabase/client";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB, per Storage requirements
const BUCKET = "receipts"; // create this bucket in the Supabase dashboard first

export default function StorageTestPage() {
  const [status, setStatus] = useState<string>("");
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_BYTES) {
      setStatus(
        "❌ File exceeds the 10MB limit — rejected client-side (as required)."
      );
      return;
    }

    setStatus("Uploading...");
    const supabase = createSupabaseBrowserClient();
    const path = `milestone0-test/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file);

    if (uploadError) {
      setStatus(`❌ Upload failed: ${uploadError.message}`);
      return;
    }

    const { data, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 5); // 5 minute signed URL

    if (signError || !data) {
      setStatus(`❌ Upload OK but signed URL failed: ${signError?.message}`);
      return;
    }

    setSignedUrl(data.signedUrl);
    setStatus("✅ Upload + signed URL retrieval succeeded.");
  };

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="rounded-3xl bg-white/70 p-6 shadow-sm backdrop-blur">
        <h1 className="text-lg font-semibold">Storage Upload Spike</h1>
        <p className="mt-1 text-xs text-slate-500">
          Requires a Storage bucket named &quot;{BUCKET}&quot; to already exist.
        </p>

        <input
          type="file"
          accept=".jpg,.jpeg,.png,.heic,.pdf"
          onChange={handleUpload}
          className="mt-4 block w-full text-sm"
        />

        {status && <p className="mt-4 text-sm">{status}</p>}

        {signedUrl && (
          <a
            href={signedUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block break-all text-xs text-sky-600 underline"
          >
            {signedUrl}
          </a>
        )}
      </div>
    </main>
  );
}
