"use client"

import { SessionProvider, signOut } from "next-auth/react"
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import { ReactNode, useState, useEffect } from "react"
import { toast } from "sonner"

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: (failureCount, error: any) => {
            if (error?.message === "Unauthorized" || error?.status === 401) return false
            return failureCount < 3
        }
      },
    },
    queryCache: new QueryCache({
        onError: (error: any) => {
            if (error?.message === "Unauthorized" || error?.status === 401) {
                toast.error("登录已过期，请重新登录")
                signOut({ callbackUrl: "/login" })
            }
        }
    }),
    mutationCache: new MutationCache({
        onError: (error: any) => {
            if (error?.message === "Unauthorized" || error?.status === 401) {
                toast.error("登录已过期，请重新登录")
                signOut({ callbackUrl: "/login" })
            }
        }
    })
  }))

  // Register Service Worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    }
  }, []);

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
