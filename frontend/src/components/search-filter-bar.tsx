"use client";

import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { ClientStatus } from "@/lib/types";

interface SearchFilterBarProps {
  status: ClientStatus | "ALL";
  onStatusChange: (status: ClientStatus | "ALL") => void;
  onSearchChange: (search: string) => void;
}

export default function SearchFilterBar({
  status,
  onStatusChange,
  onSearchChange,
}: SearchFilterBarProps) {
  const [localSearch, setLocalSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      onSearchChange(localSearch);
    }, 250);

    return () => {
      clearTimeout(handler);
    };
  }, [localSearch, onSearchChange]);

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
      {/* Search Input */}
      <div className="relative w-full sm:max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400 dark:text-slate-500" />
        </div>
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Поиск по имени или телефону..."
          className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-foreground placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all duration-200"
        />
      </div>

      {/* Filter Select */}
      <div className="w-full sm:w-auto flex items-center gap-3">
        <label className="text-sm font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap hidden md:inline">
          Статус:
        </label>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as ClientStatus | "ALL")}
          className="block w-full sm:w-48 px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all duration-200 cursor-pointer text-slate-700 dark:text-slate-300 font-medium"
        >
          <option value="ALL">Все статусы</option>
          <option value="NEW">Новый</option>
          <option value="IN_PROGRESS">В работе</option>
          <option value="CLOSED">Закрыт</option>
        </select>
      </div>
    </div>
  );
}
