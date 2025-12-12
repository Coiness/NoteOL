import type { NextConfig } from "next";
import withPWA from '@ducanh2912/next-pwa';

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  // 禁用 Turbopack，强制使用 Webpack
  // turbopack: {}, // 移除这行
};

export default withBundleAnalyzer(withPWA({
  dest: 'public',
  register: true,
  disable: false,
  fallbacks: {
    document: '/offline', // 确保有这个页面
  },
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: /^https?.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'noteol-dynamic-cache',
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 24 * 60 * 60,
          },
        },
      },
    ],
  },
})(nextConfig));