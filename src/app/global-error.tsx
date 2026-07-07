"use client";

import { useEffect } from "react";
import { logError } from "@/shared/logging/logError";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError({
      module: "global-error-boundary",
      errorMessage: error.message,
      stackTrace: error.stack,
    });
  }, [error]);

  return (
    <html lang="th">
      <body className="flex min-h-screen items-center justify-center bg-sky-50 p-6">
        <div className="rounded-3xl bg-white/80 p-8 text-center shadow-sm backdrop-blur">
          <h1 className="text-lg font-semibold text-slate-800">
            เกิดข้อผิดพลาด / Something went wrong
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            The error has been logged automatically.
          </p>
        </div>
      </body>
    </html>
  );
}
