"use client";

import React from "react";
import { Client } from "@/lib/types";
import ClientRow from "./client-row";
import { Inbox } from "lucide-react";

interface ClientTableProps {
  clients: Client[];
  isLoading: boolean;
  isDemo?: boolean;
}

export default function ClientTable({ clients, isLoading, isDemo = false }: ClientTableProps) {
  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">ФИО Клиента</th>
              <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Телефон</th>
              <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Суть дела</th>
              <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Дедлайн</th>
              <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...Array(3)].map((_, idx) => (
              <tr key={idx} className="animate-pulse">
                <td className="p-4 py-5"><div className="h-4 bg-slate-200 rounded-md w-36" /></td>
                <td className="p-4 py-5"><div className="h-4 bg-slate-200 rounded-md w-28" /></td>
                <td className="p-4 py-5"><div className="h-4 bg-slate-200 rounded-md w-48" /></td>
                <td className="p-4 py-5"><div className="h-4 bg-slate-200 rounded-md w-20" /></td>
                <td className="p-4 py-5"><div className="h-6 bg-slate-200 rounded-full w-24" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-center gap-3 bg-white">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
          <Inbox className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900">Список пуст</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
            Клиенты с заданными фильтрами не найдены. Попробуйте сбросить фильтры или добавить нового клиента.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/75 border-b border-slate-200">
            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ФИО Клиента</th>
            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Телефон</th>
            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Суть дела</th>
            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Дедлайн</th>
            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Статус</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {clients.map((client) => (
            <ClientRow key={client.id} client={client} isDemo={isDemo} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
