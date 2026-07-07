export default function NoAccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 to-white p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white/70 p-8 text-center shadow-sm backdrop-blur">
        <h1 className="text-lg font-semibold text-slate-800">
          This account isn&apos;t authorized
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Your email isn&apos;t on the whitelist for this project. Ask the
          Owner to add it in Settings → Users.
        </p>
      </div>
    </main>
  );
}
