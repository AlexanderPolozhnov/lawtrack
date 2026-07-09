"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchStatusCounts } from "@/lib/api";
import { ClientStatus } from "@/lib/types";
import StatsCards from "@/components/stats-cards";
import SearchFilterBar from "@/components/search-filter-bar";
import ClientTable from "@/components/client-table";
import AddClientDialog from "@/components/add-client-dialog";
import ClientDetailsDrawer from "@/components/client-details-drawer";
import ThemeToggle from "@/components/theme-toggle";
import { useClients } from "@/hooks/use-clients";
import { AlertCircle, Plus } from "lucide-react";

const mockCounts = {
  newCount: 1,
  inProgressCount: 1,
  closedCount: 1,
  total: 3
};

const mockClients = [
  {
    id: 1,
    name: "Иван Иванов (Демо)",
    phone: "+79991112233",
    status: "NEW" as const,
    statusDisplayName: "Новый",
    caseDescription: "Развод и раздел имущества",
    deadline: "2026-08-15",
    createdAt: "2026-07-09T14:15:00"
  },
  {
    id: 2,
    name: "Анна Кузнецова (Демо)",
    phone: "+79994445566",
    status: "IN_PROGRESS" as const,
    statusDisplayName: "В работе",
    caseDescription: "Оформление земельного участка в собственность",
    deadline: "2026-09-30",
    createdAt: "2026-07-09T14:20:00"
  },
  {
    id: 3,
    name: "Сергей Петров (Демо)",
    phone: "+79997778899",
    status: "CLOSED" as const,
    statusDisplayName: "Закрыт",
    caseDescription: "Арбитражный спор по поставке оборудования",
    deadline: "2026-07-10",
    createdAt: "2026-07-09T14:30:00"
  }
];

export default function Home() {
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const {
    data: statusCounts,
    isLoading: isCountsLoading,
    isError: isCountsError,
  } = useQuery({
    queryKey: ["statusCounts"],
    queryFn: fetchStatusCounts,
    retry: 1,
  });

  const {
    data: clients,
    isLoading: isClientsLoading,
    isError: isClientsError,
  } = useClients(statusFilter, searchQuery);

  const isApiError = isCountsError || isClientsError;
  const isApiLoading = isCountsLoading || isClientsLoading;

  const displayClients = isApiError
    ? mockClients.filter((c) => {
        const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
        const matchesSearch =
          !searchQuery ||
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.phone.includes(searchQuery);
        return matchesStatus && matchesSearch;
      })
    : clients ?? [];

  const displayCounts = isApiError ? mockCounts : statusCounts;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-indigo-200 dark:shadow-none">
              L
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">LawTrack</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Система управления делами</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isApiError ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-950/50">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                API Недоступно (Демо)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-950/50">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                API Активно
              </span>
            )}
            
            <button
              onClick={() => setIsAddDialogOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-sm hover:shadow transition-all duration-200 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Добавить</span>
            </button>

            <ThemeToggle />

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-semibold text-sm">
                АП
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden md:inline">Александр П.</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        {/* Welcome Section */}
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Рабочее пространство</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-sm sm:text-base">
            Добро пожаловать в LawTrack CRM. Здесь собраны все ваши клиенты, текущие дела и статистика эффективности.
          </p>
        </div>

        {/* Stats Grid */}
        <StatsCards
          counts={displayCounts}
          activeStatus={statusFilter}
          onStatusSelect={setStatusFilter}
          isLoading={isApiLoading && !isApiError}
        />

        {/* Search & Filter Bar */}
        <SearchFilterBar
          status={statusFilter}
          onStatusChange={setStatusFilter}
          onSearchChange={setSearchQuery}
        />

        {/* API Error Warning */}
        {isApiError && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 flex gap-3 text-amber-800 dark:text-amber-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-500" />
            <div>
              <span className="font-semibold">Внимание:</span> Бэкенд не отвечает. Отображаются демонстрационные локальные данные. Убедитесь, что сервер Spring Boot запущен на порту 8080.
            </div>
          </div>
        )}

        {/* Clients Table Box */}
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Список клиентов</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {statusFilter === "ALL"
                  ? "Все зарегистрированные клиенты"
                  : `Клиенты в статусе "${
                      statusFilter === "NEW"
                        ? "Новый"
                        : statusFilter === "IN_PROGRESS"
                        ? "В работе"
                        : "Закрыт"
                    }"`}
              </p>
            </div>
            <button
              onClick={() => setIsAddDialogOpen(true)}
              className="self-start sm:self-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-md shadow-indigo-100 dark:shadow-none hover:shadow-lg transition-all duration-200 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Добавить клиента
            </button>
          </div>

          <ClientTable
            clients={displayClients}
            isLoading={isApiLoading && !isApiError}
            isDemo={isApiError}
            onRowClick={(id) => {
              setSelectedClientId(id);
              setIsDrawerOpen(true);
            }}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-card py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-400 dark:text-slate-500">
          &copy; {new Date().getFullYear()} LawTrack CRM. Все права защищены.
        </div>
      </footer>

      {/* Add Client Dialog */}
      <AddClientDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
      />

      {/* Client Details Drawer */}
      <ClientDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        clientId={selectedClientId}
        clients={displayClients}
      />
    </div>
  );
}
