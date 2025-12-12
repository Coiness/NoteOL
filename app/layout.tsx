import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner"
import { Providers } from "@/components/providers/providers"
import "./globals.css";

export const metadata: Metadata = {
  title: "NoteOL - 在线笔记平台",
  description: "一个现代化的在线笔记与知识库平台",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NoteOL",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        <Toaster expand={false} />
      </body>
    </html>
  );
}
