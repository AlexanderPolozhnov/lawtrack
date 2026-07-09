import type { Metadata } from "next";
import Providers from "@/lib/query-client-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "LawTrack CRM",
  description: "Мини-CRM для юриста",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-[#fafafa] text-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
