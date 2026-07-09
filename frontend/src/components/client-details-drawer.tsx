"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Calendar, Phone, User, Briefcase, Plus, AlertCircle, Clock, CheckCircle2, MessageSquare, Loader2, Trash2 } from "lucide-react";
import { Client, ClientStatus } from "@/lib/types";
import { useEvents, useAddNote } from "@/hooks/use-events";
import { useUpdateStatus } from "@/hooks/use-update-status";
import { useDeleteClient } from "@/hooks/use-delete-client";

interface ClientDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number | null;
  clients: Client[];
}

export default function ClientDetailsDrawer({ isOpen, onClose, clientId, clients }: ClientDetailsDrawerProps) {
  const [noteText, setNoteText] = useState("");
  const updateStatusMutation = useUpdateStatus();
  const addNoteMutation = useAddNote();
  const deleteClientMutation = useDeleteClient();
  const drawerRef = useRef<HTMLDivElement>(null);

  const handleDelete = () => {
    if (!client) return;
    if (window.confirm(`Вы действительно хотите удалить клиента "${client.name}"?`)) {
      deleteClientMutation.mutate(client.id, {
        onSuccess: () => {
          onClose();
        },
        onError: (err: any) => {
          alert(`Ошибка удаления клиента: ${err.message || "Неизвестная ошибка"}`);
        },
      });
    }
  };

  const client = clients.find((c) => c.id === clientId) || null;

  const { data: events = [], isLoading: isEventsLoading } = useEvents(client?.id);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (isOpen && drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !client) return null;

  const isOverdue = client.deadline && client.status !== "CLOSED" && new Date(client.deadline) < new Date(new Date().setHours(0, 0, 0, 0));

  const handleStatusChange = (newStatus: ClientStatus) => {
    updateStatusMutation.mutate({ id: client.id, status: newStatus });
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    addNoteMutation.mutate(
      { clientId: client.id, note: noteText.trim() },
      {
        onSuccess: () => {
          setNoteText("");
        },
      }
    );
  };

  const formatEventDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

  const formatDeadline = (dateStr?: string) => {
    if (!dateStr) return "Не установлен";
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className="relative w-full max-w-lg bg-card border-l border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-2xl z-10 animate-slide-in-right overflow-hidden transition-colors duration-200"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Карточка дела
            </span>
            <h2 className="text-xl font-bold text-foreground mt-1 truncate max-w-[320px]">
              {client.name}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDelete}
              disabled={deleteClientMutation.isPending}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all duration-200 cursor-pointer"
              title="Удалить карточку"
            >
              {deleteClientMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Main Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Основная информация
            </h3>
            
            <div className="grid grid-cols-1 gap-4 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-900">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-400">ФИО клиента</div>
                  <div className="text-sm font-medium text-foreground">{client.name}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-400">Телефон</div>
                  <a href={`tel:${client.phone}`} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                    {client.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Briefcase className="w-4 h-4 text-slate-400 mt-1" />
                <div className="flex-1">
                  <div className="text-xs text-slate-400">Описание дела</div>
                  <div className="text-sm text-foreground whitespace-pre-line mt-0.5">
                    {client.caseDescription || "Описание отсутствует"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400">Срок (Дедлайн)</div>
                    <div className={`text-sm font-semibold ${isOverdue ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
                      {formatDeadline(client.deadline)}
                    </div>
                  </div>
                  {isOverdue && (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-950">
                      <AlertCircle className="w-3 h-3" /> Просрочен
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Status Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Текущий статус дела
            </h3>
            <div className="flex gap-2">
              {(["NEW", "IN_PROGRESS", "CLOSED"] as ClientStatus[]).map((statusVal) => {
                const isActive = client.status === statusVal;
                let btnClass = "flex-1 py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all duration-200 cursor-pointer ";
                
                if (statusVal === "NEW") {
                  btnClass += isActive
                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900"
                    : "bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800";
                } else if (statusVal === "IN_PROGRESS") {
                  btnClass += isActive
                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900"
                    : "bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800";
                } else if (statusVal === "CLOSED") {
                  btnClass += isActive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900"
                    : "bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800";
                }

                let label = "Новый";
                if (statusVal === "IN_PROGRESS") label = "В работе";
                if (statusVal === "CLOSED") label = "Закрыт";

                return (
                  <button
                    key={statusVal}
                    onClick={() => handleStatusChange(statusVal)}
                    disabled={updateStatusMutation.isPending}
                    className={btnClass}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timeline of events */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Хронология дела
            </h3>

            {/* Note form */}
            <form onSubmit={handleAddNote} className="space-y-2">
              <div className="relative">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Добавить новую заметку по делу..."
                  rows={2}
                  className="w-full text-sm px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent text-foreground placeholder:text-slate-400 transition-all resize-none"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={addNoteMutation.isPending || !noteText.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {addNoteMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  Добавить заметку
                </button>
              </div>
            </form>

            {/* Timeline component */}
            {isEventsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-400">
                Событий пока нет.
              </div>
            ) : (
              <div className="relative pl-6 border-l border-slate-200 dark:border-slate-800 space-y-6 mt-4">
                {events.map((event) => {
                  let dotBg = "bg-indigo-600 dark:bg-indigo-400 ring-4 ring-indigo-50 dark:ring-indigo-950/50";

                  if (event.eventType === "CREATED") {
                    dotBg = "bg-blue-600 dark:bg-blue-400 ring-4 ring-blue-50 dark:ring-blue-950/50";
                  } else if (event.eventType === "STATUS_CHANGED") {
                    dotBg = "bg-amber-600 dark:bg-amber-400 ring-4 ring-amber-50 dark:ring-amber-950/50";
                  } else if (event.eventType === "NOTE_ADDED") {
                    dotBg = "bg-indigo-600 dark:bg-indigo-400 ring-4 ring-indigo-50 dark:ring-indigo-950/50";
                  }

                  return (
                    <div key={event.id} className="relative group">
                      {/* Timeline Dot */}
                      <span className={`absolute -left-[31px] top-1.5 flex items-center justify-center w-6 h-6 rounded-full ${dotBg}`}>
                        <span className="w-1.5 h-1.5 bg-white rounded-full" />
                      </span>

                      {/* Event Content */}
                      <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900 p-3.5 rounded-xl transition-all duration-200 hover:border-slate-200 dark:hover:border-slate-800">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            {event.eventType === "CREATED" && "Инициация"}
                            {event.eventType === "STATUS_CHANGED" && "Смена статуса"}
                            {event.eventType === "NOTE_ADDED" && "Заметка юриста"}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            {formatEventDate(event.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
