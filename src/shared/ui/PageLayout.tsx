import type { ReactNode } from "react";

export type PageLayoutProps = {
  title: string;
  actions?: ReactNode;
  search?: ReactNode;
  pagination?: ReactNode;
  children: ReactNode;
};

/**
 * Enforces the UI Consistency rule from the UI/UX Design doc:
 * Header → Page Title → Action Buttons → Search → Content → Pagination.
 * Feature pages fill slots here; they never rebuild this shell themselves.
 */
export function PageLayout({
  title,
  actions,
  search,
  pagination,
  children,
}: PageLayoutProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>

      {search && <div className="mt-4">{search}</div>}

      <div className="mt-6">{children}</div>

      {pagination && <div className="mt-6">{pagination}</div>}
    </div>
  );
}
