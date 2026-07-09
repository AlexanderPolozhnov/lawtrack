import React from "react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-indigo-200">
              L
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">LawTrack</h1>
              <p className="text-xs text-slate-500">Система управления делами</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              API Активно
            </span>
            <div className="h-8 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
                АП
              </div>
              <span className="text-sm font-medium text-slate-700 hidden sm:inline">Александр П.</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        
        {/* Welcome Section */}
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Рабочее пространство</h2>
          <p className="text-slate-500 max-w-2xl">
            Добро пожаловать в LawTrack CRM. Здесь собраны все ваши клиенты, текущие дела и статистика эффективности. Скелет приложения успешно настроен.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-500">Всего клиентов</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                📊
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-950">25</span>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">+3 за неделю</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-500">Новые заявки</span>
              <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-all duration-300">
                ✨
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-950">5</span>
              <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">Требуют внимания</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-500">Дела в работе</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all duration-300">
                💼
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-950">12</span>
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">Активные процессы</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-500">Закрытые дела</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                ✅
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-950">8</span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Успешно завершены</span>
            </div>
          </div>
        </div>

        {/* Clients Table Box */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Список клиентов (Демонстрация)</h3>
              <p className="text-sm text-slate-500">Пример отображения данных из ТЗ контракта</p>
            </div>
            <button className="self-start sm:self-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-md shadow-indigo-100 hover:shadow-lg transition-all duration-200 cursor-pointer">
              <span>+</span> Добавить клиента
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">ФИО Клиента</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Телефон</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Суть дела</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Дедлайн</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="hover:bg-slate-50/85 transition-colors">
                  <td className="p-4 font-semibold text-slate-900">Иван Иванов</td>
                  <td className="p-4 text-slate-600">+7 (999) 111-22-33</td>
                  <td className="p-4 text-slate-600 max-w-xs truncate">Развод и раздел имущества</td>
                  <td className="p-4 text-slate-600">15.08.2026</td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Новый
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/85 transition-colors">
                  <td className="p-4 font-semibold text-slate-900">Анна Кузнецова</td>
                  <td className="p-4 text-slate-600">+7 (999) 444-55-66</td>
                  <td className="p-4 text-slate-600 max-w-xs truncate">Оформление земельного участка в собственность</td>
                  <td className="p-4 text-slate-600">30.09.2026</td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      В работе
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/85 transition-colors">
                  <td className="p-4 font-semibold text-slate-900">Сергей Петров</td>
                  <td className="p-4 text-slate-600">+7 (999) 777-88-99</td>
                  <td className="p-4 text-slate-600 max-w-xs truncate">Арбитражный спор по поставке оборудования</td>
                  <td className="p-4 text-slate-600">10.07.2026</td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Закрыт
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} LawTrack CRM. Все права защищены.
        </div>
      </footer>
    </div>
  );
}
