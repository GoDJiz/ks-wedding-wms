"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { formatCurrency } from "@/shared/lib/formatCurrency";
import type {
  CategoryBreakdownItem,
  MonthlyTrendItem,
} from "../domain/DashboardSummary";

export function CategoryBreakdownChart({
  data,
}: {
  data: CategoryBreakdownItem[];
}) {
  const { t } = useLanguage();

  return (
    <div className="rounded-2xl bg-white/70 p-4">
      <p className="mb-3 text-sm font-medium text-slate-600">
        {t.dashboard.categoryBreakdown}
      </p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
            <XAxis
              type="number"
              tickFormatter={(v) => formatCurrency(v)}
              fontSize={11}
            />
            <YAxis
              type="category"
              dataKey="categoryName"
              width={100}
              fontSize={11}
              tick={{ fill: "#475569" }}
            />
            <Tooltip formatter={(v) => formatCurrency(Number(v))} />
            <Bar dataKey="spent" fill="#7dd3fc" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function MonthlyTrendChart({ data }: { data: MonthlyTrendItem[] }) {
  const { t } = useLanguage();

  return (
    <div className="rounded-2xl bg-white/70 p-4">
      <p className="mb-3 text-sm font-medium text-slate-600">
        {t.dashboard.monthlyTrend}
      </p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
            <XAxis dataKey="month" fontSize={11} />
            <YAxis
              tickFormatter={(v) => formatCurrency(v)}
              fontSize={11}
              width={80}
            />
            <Tooltip formatter={(v) => formatCurrency(Number(v))} />
            <Line
              type="monotone"
              dataKey="expense"
              stroke="#fb7185"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="income"
              stroke="#4ade80"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
