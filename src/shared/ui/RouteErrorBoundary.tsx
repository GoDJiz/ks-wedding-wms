"use client";

import { useEffect } from "react";
import { logError } from "@/shared/logging/logError";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Button } from "@/shared/ui/Button";

export function RouteErrorBoundary({
  error,
  reset,
  module: moduleName,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  module: string;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    logError({
      module: moduleName,
      errorMessage: error.message,
      stackTrace: error.stack,
    });
  }, [error, moduleName]);

  return (
    <div className="mx-auto max-w-md p-6 text-center">
      <div className="rounded-3xl bg-white/70 p-8 shadow-sm backdrop-blur">
        <p className="text-sm font-medium text-slate-700">
          {t.common.somethingWrong}
        </p>
        <Button className="mt-4" onClick={reset}>
          {t.common.tryAgain}
        </Button>
      </div>
    </div>
  );
}
