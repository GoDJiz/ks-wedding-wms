import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { DashboardHeader } from "@/shared/ui/DashboardHeader";

// Every route under (dashboard) is protected here, once — no page below
// needs to repeat the auth check. requireSessionContext() redirects to
// /login (no session) or /no-project (session but no project membership).
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSessionContext();

  return (
    <div className="min-h-screen">
      <DashboardHeader showBack />
      {children}
    </div>
  );
}
