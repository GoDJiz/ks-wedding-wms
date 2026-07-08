import { PageLayout } from "@/shared/ui/PageLayout";
import { InlineError } from "@/shared/ui/StateViews";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { getDictionary, translateErrorCode } from "@/lib/i18n/getDictionary";
import { getPaymentAccounts } from "@/features/payment-accounts/application/paymentAccountsActions";
import { PaymentAccountsManager } from "@/features/payment-accounts/components/PaymentAccountsManager";

export default async function PaymentAccountsPage() {
  const { projectId } = await requireSessionContext();
  const { t } = await getDictionary();
  const result = await getPaymentAccounts(projectId);

  return (
    <PageLayout title={t.paymentAccounts.pageTitle}>
      {result.ok ? (
        <PaymentAccountsManager
          projectId={projectId}
          initialAccounts={result.data}
        />
      ) : (
        <InlineError message={translateErrorCode(t, result.code)} />
      )}
    </PageLayout>
  );
}
