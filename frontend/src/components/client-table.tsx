"use client";

import React, { useState, useMemo } from "react";
import { Client } from "@/lib/types";
import ClientRow from "./client-row";
import { Inbox, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface ClientTableProps {
  clients: Client[];
  isLoading: boolean;
  isDemo?: boolean;
  onRowClick?: (clientId: number) => void;
}

type SortField = keyof Client;

export default function ClientTable({ clients, isLoading, isDemo = false, onRowClick }: ClientTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedClients = useMemo(() => {
    if (!sortField) return clients;
    return [...clients].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [clients, sortField, sortDirection]);

  if (isLoading) {
    return (
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
              <th className="p-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ФИО Клиента</th>
              <th className="p-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Телефон</th>
              <th className="p-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Суть дела</th>
              <th className="p-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Дедлайн</th>
              <th className="p-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Статус</th>
              <th className="p-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {[...Array(3)].map((_, idx) => (
              <tr key={idx} className="animate-pulse">
                <td className="p-4 py-5"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-36" /></td>
                <td className="p-4 py-5"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-28" /></td>
                <td className="p-4 py-5"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-48" /></td>
                <td className="p-4 py-5"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-20" /></td>
                <td className="p-4 py-5"><div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-full w-24" /></td>
                <td className="p-4 py-5"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-8 ml-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-center gap-3 bg-white dark:bg-card">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
          <Inbox className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Список пуст</h4>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[280px]">
            Клиенты с заданными фильтрами не найдены. Попробуйте сбросить фильтры или добавить нового клиента.
          </p>
        </div>
      </div>
    );
  }

  const renderSortHeader = (label: string, field: SortField) => {
    const isActive = sortField === field;
    return (
      <th 
        className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group select-none"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          {label}
          {isActive ? (
            sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-indigo-500" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
        <thead>
          <tr className="bg-slate-50/75 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
            {renderSortHeader("ФИО Клиента", "name")}
            {renderSortHeader("Телефон", "phone")}
            {renderSortHeader("Суть дела", "caseDescription")}
            {renderSortHeader("Дедлайн", "deadline")}
            {renderSortHeader("Статус", "status")}
            <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-card">
          {sortedClients.map((client) => (
            <ClientRow key={client.id} client={client} isDemo={isDemo} onRowClick={onRowClick} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
