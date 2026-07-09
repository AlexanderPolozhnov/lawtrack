"use client";

import React, { useState, useRef, useEffect } from "react";
import { Client, ClientStatus } from "@/lib/types";
import { useUpdateStatus } from "@/hooks/use-update-status";
import { ChevronDown, Loader2, AlertCircle } from "lucide-react";

interface ClientRowProps {
  client: Client;
  isDemo?: boolean;
  onRowClick?: (clientId: number) => void;
}

export default function ClientRow({ client, isDemo = false, onRowClick }: ClientRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const updateStatusMutation = useUpdateStatus();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getStatusConfig = (status: ClientStatus) => {
    switch (status) {
      case "NEW":
        return {
          bgClass: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/70 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900 dark:hover:bg-blue-950/60",
          dotClass: "bg-blue-500",
          label: "Новый",
        };
      case "IN_PROGRESS":
        return {
          bgClass: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/70 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900 dark:hover:bg-amber-950/60",
          dotClass: "bg-amber-500",
          label: "В работе",
        };
      case "CLOSED":
        return {
          bgClass: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900 dark:hover:bg-emerald-950/60",
          dotClass: "bg-emerald-500",
          label: "Закрыт",
        };
    }
  };

  const currentConfig = getStatusConfig(client.status);

  const handleStatusSelect = (newStatus: ClientStatus) => {
    setIsOpen(false);
    if (newStatus === client.status) return;

    if (isDemo) {
      alert("В демо-режиме изменение статуса не отправляется на сервер.");
      return;
    }

    updateStatusMutation.mutate(
      { id: client.id, status: newStatus },
      {
        onError: (err: any) => {
          alert(`Ошибка обновления статуса: ${err.message || "Неизвестная ошибка"}`);
        },
      }
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "—";
      return date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const isOverdue = client.deadline && client.status !== "CLOSED" && new Date(client.deadline) < new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <tr
      onClick={() => onRowClick && onRowClick(client.id)}
      className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors duration-150 border-b border-slate-100 dark:border-slate-800 cursor-pointer"
    >
      {/* Name */}
      <td className="p-4 py-4.5 font-semibold text-slate-900 dark:text-slate-100 align-middle">
        {client.name}
      </td>

      {/* Phone */}
      <td className="p-4 py-4.5 text-slate-600 dark:text-slate-400 align-middle font-medium">
        {client.phone}
      </td>

      {/* Case Description */}
      <td className="p-4 py-4.5 text-slate-500 dark:text-slate-400 max-w-xs truncate align-middle" title={client.caseDescription}>
        {client.caseDescription || <span className="text-slate-300 dark:text-slate-700">—</span>}
      </td>

      {/* Deadline */}
      <td className="p-4 py-4.5 text-slate-600 dark:text-slate-400 align-middle font-medium">
        <div className="flex items-center gap-1.5">
          {isOverdue && (
            <span title="Дедлайн просрочен" className="flex shrink-0">
              <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 animate-pulse" />
            </span>
          )}
          <span className={isOverdue ? "text-rose-600 dark:text-rose-400 font-semibold" : ""}>
            {formatDate(client.deadline)}
          </span>
        </div>
      </td>

      {/* Status Column */}
      <td className="p-4 py-4.5 align-middle relative">
        <div ref={dropdownRef} className="inline-block text-left">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            disabled={updateStatusMutation.isPending}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 active:scale-[0.98] cursor-pointer ${currentConfig.bgClass}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${currentConfig.dotClass}`} />
            <span>{client.statusDisplayName || currentConfig.label}</span>
            {updateStatusMutation.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            )}
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-4 mt-1.5 w-40 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-20 transform scale-100 origin-top-left transition-all duration-200 animate-scale-up"
            >
              {/* Option NEW */}
              <button
                onClick={() => handleStatusSelect("NEW")}
                className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors ${
                  client.status === "NEW" ? "text-blue-700 bg-blue-50/40 dark:text-blue-400 dark:bg-blue-950/20" : "text-slate-700 dark:text-slate-300"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Новый
              </button>

              {/* Option IN_PROGRESS */}
              <button
                onClick={() => handleStatusSelect("IN_PROGRESS")}
                className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors ${
                  client.status === "IN_PROGRESS" ? "text-amber-700 bg-amber-50/40 dark:text-amber-400 dark:bg-amber-950/20" : "text-slate-700 dark:text-slate-300"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                В работе
              </button>

              {/* Option CLOSED */}
              <button
                onClick={() => handleStatusSelect("CLOSED")}
                className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors ${
                  client.status === "CLOSED" ? "text-emerald-700 bg-emerald-50/40 dark:text-emerald-400 dark:bg-emerald-950/20" : "text-slate-700 dark:text-slate-300"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Закрыт
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
