"use client";

import React from "react";
import { Users, Sparkles, Briefcase, CheckCircle2 } from "lucide-react";
import { StatusCounts, ClientStatus } from "@/lib/types";

interface StatsCardsProps {
  counts?: StatusCounts;
  activeStatus: ClientStatus | "ALL";
  onStatusSelect: (status: ClientStatus | "ALL") => void;
  isLoading?: boolean;
}

export default function StatsCards({
  counts,
  activeStatus,
  onStatusSelect,
  isLoading = false,
}: StatsCardsProps) {
  const stats = [
    {
      id: "ALL" as const,
      name: "Всего клиентов",
      value: counts?.total ?? 0,
      icon: Users,
      colorClass: "text-indigo-600 bg-indigo-50 border-indigo-100 dark:text-indigo-400 dark:bg-indigo-950/30 dark:border-indigo-900/50",
      activeClass: "ring-2 ring-indigo-600 dark:ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900",
      hoverClass: "hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-indigo-50 dark:hover:shadow-none",
    },
    {
      id: "NEW" as const,
      name: "Новые заявки",
      value: counts?.newCount ?? 0,
      icon: Sparkles,
      colorClass: "text-blue-600 bg-blue-50 border-blue-100 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-900/50",
      activeClass: "ring-2 ring-blue-600 dark:ring-blue-500 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900",
      hoverClass: "hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-blue-50 dark:hover:shadow-none",
    },
    {
      id: "IN_PROGRESS" as const,
      name: "Дела в работе",
      value: counts?.inProgressCount ?? 0,
      icon: Briefcase,
      colorClass: "text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-900/50",
      activeClass: "ring-2 ring-amber-600 dark:ring-amber-500 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900",
      hoverClass: "hover:border-amber-300 dark:hover:border-amber-800 hover:shadow-amber-50 dark:hover:shadow-none",
    },
    {
      id: "CLOSED" as const,
      name: "Закрытые дела",
      value: counts?.closedCount ?? 0,
      icon: CheckCircle2,
      colorClass: "text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-900/50",
      activeClass: "ring-2 ring-emerald-600 dark:ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900",
      hoverClass: "hover:border-emerald-300 dark:hover:border-emerald-800 hover:shadow-emerald-50 dark:hover:shadow-none",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const isActive = activeStatus === stat.id;

        if (isLoading) {
          return (
            <div
              key={stat.id}
              className="p-6 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="h-8 w-12 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          );
        }

        return (
          <button
            key={stat.id}
            onClick={() => onStatusSelect(stat.id)}
            className={`p-6 rounded-2xl bg-white dark:bg-card border text-left shadow-sm cursor-pointer transition-all duration-300 transition-card group transform hover:-translate-y-0.5 ${
              isActive ? stat.activeClass : "border-slate-200 dark:border-slate-800 " + stat.hoverClass
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-500 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-300 transition-colors">
                {stat.name}
              </span>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 ${stat.colorClass}`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-950 dark:text-slate-100 tracking-tight">
                {stat.value}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
