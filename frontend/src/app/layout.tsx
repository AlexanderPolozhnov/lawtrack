import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "@/lib/query-client-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

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
    <html lang="ru" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-[#fafafa] text-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
