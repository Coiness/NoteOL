import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner"
import { Providers } from "@/components/providers/providers"
import "./globals.css";

export const metadata: Metadata = {
  title: "NoteOL - 在线笔记平台",
  description: "一个现代化的在线笔记与知识库平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
