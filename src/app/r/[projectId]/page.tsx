import { getPublicProject } from "@/features/reimbursement/application/publicReimbursementActions";
import { PublicReimbursementForm } from "@/features/reimbursement/components/PublicReimbursementForm";
import { getDictionary } from "@/lib/i18n/getDictionary";

export default async function PublicReimbursementPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { t } = await getDictionary();
  const result = await getPublicProject(projectId);

  if (!result.ok) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 to-white p-6">
        <div className="w-full max-w-sm rounded-3xl bg-white/70 p-8 text-center shadow-sm backdrop-blur">
          <p className="text-sm text-slate-600">
            {t.reimbursementPublic.invalidLink}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-white p-6">
      <PublicReimbursementForm project={result.data} />
    </main>
  );
}
