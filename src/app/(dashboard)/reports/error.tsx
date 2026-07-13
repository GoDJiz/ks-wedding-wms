"use client";

import { RouteErrorBoundary } from "@/shared/ui/RouteErrorBoundary";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      module="app/(dashboard)/reports"
    />
  );
}
