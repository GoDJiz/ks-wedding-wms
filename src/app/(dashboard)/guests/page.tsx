import { PageLayout } from "@/shared/ui/PageLayout";
import { InlineError } from "@/shared/ui/StateViews";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { getDictionary, translateErrorCode } from "@/lib/i18n/getDictionary";
import { getGuests } from "@/features/guest/application/guestActions";
import { GuestPageClient } from "@/features/guest/components/GuestPageClient";

export default async function GuestsPage() {
  const { projectId } = await requireSessionContext();
  const { t } = await getDictionary();
  const result = await getGuests(projectId, 0, "", "all");

  return (
    <PageLayout title={t.guest.pageTitle}>
      {result.ok ? (
        <GuestPageClient
          projectId={projectId}
          initialGuests={result.data.guests}
          initialTotalCount={result.data.totalCount}
          pageSize={result.data.pageSize}
        />
      ) : (
        <InlineError message={translateErrorCode(t, result.code)} />
      )}
    </PageLayout>
  );
}
