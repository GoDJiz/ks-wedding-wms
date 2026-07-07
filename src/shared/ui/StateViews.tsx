export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl animate-pulse px-4 pt-6 sm:px-6">
      <div className="h-6 w-40 rounded-full bg-sky-100" />
      <div className="mt-6 space-y-3">
        <div className="h-14 rounded-2xl bg-sky-100/70" />
        <div className="h-14 rounded-2xl bg-sky-100/70" />
        <div className="h-14 rounded-2xl bg-sky-100/70" />
      </div>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-white/60 px-4 py-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
    >
      {message}
    </p>
  );
}
