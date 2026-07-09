"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, Loader2, Sparkles } from "lucide-react";
import { useCreateClient } from "@/hooks/use-create-client";

const clientSchema = z.object({
  name: z.string().min(2, "Введите имя клиента (минимум 2 символа)").max(150, "Имя слишком длинное"),
  phone: z.string().regex(/^\+?[0-9\s\-()]{7,20}$/, "Некорректный формат телефона"),
  caseDescription: z.string().max(1000, "Описание слишком длинное").optional(),
  deadline: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface AddClientDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddClientDialog({ isOpen, onClose }: AddClientDialogProps) {
  const createClientMutation = useCreateClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      phone: "",
      caseDescription: "",
      deadline: "",
    },
  });

  // Reset form and state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      reset({
        name: "",
        phone: "",
        caseDescription: "",
        deadline: "",
      });
      setErrorMsg(null);
    }
  }, [isOpen, reset]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const onSubmit = (data: ClientFormValues) => {
    setErrorMsg(null);
    
    // Normalize empty strings to undefined for API
    const payload = {
      name: data.name.trim(),
      phone: data.phone.trim(),
      caseDescription: data.caseDescription?.trim() || undefined,
      deadline: data.deadline || undefined,
    };

    createClientMutation.mutate(payload, {
      onSuccess: () => {
        onClose();
      },
      onError: (err: any) => {
        setErrorMsg(err.message || "Произошла ошибка при создании клиента.");
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog Content */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden relative z-10 transform transition-all duration-300 scale-95 animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Новый клиент</h3>
              <p className="text-xs text-slate-500">Добавление нового дела в CRM</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors cursor-pointer"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-sm font-medium">
              {errorMsg}
            </div>
          )}

          {/* Name Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              ФИО Клиента <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Иванов Иван Иванович"
              {...register("name")}
              className={`block w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                errors.name ? "border-rose-300 bg-rose-50/10 focus:ring-rose-500 focus:border-rose-500" : "border-slate-200"
              }`}
            />
            {errors.name && (
              <span className="text-xs font-medium text-rose-600 mt-0.5">{errors.name.message}</span>
            )}
          </div>

          {/* Phone Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Номер телефона <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="+7 (999) 111-22-33"
              {...register("phone")}
              className={`block w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                errors.phone ? "border-rose-300 bg-rose-50/10 focus:ring-rose-500 focus:border-rose-500" : "border-slate-200"
              }`}
            />
            {errors.phone && (
              <span className="text-xs font-medium text-rose-600 mt-0.5">{errors.phone.message}</span>
            )}
          </div>

          {/* Deadline Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Срок решения (Дедлайн)
            </label>
            <input
              type="date"
              {...register("deadline")}
              className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-slate-700 cursor-pointer"
            />
          </div>

          {/* Case Description Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Суть дела / Описание
            </label>
            <textarea
              rows={3}
              placeholder="Опишите детали дела, ключевые требования или суть спора..."
              {...register("caseDescription")}
              className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={createClientMutation.isPending}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-400 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-100 hover:shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer"
            >
              {createClientMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Создать клиента"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
