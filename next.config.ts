import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  experimental: {
    serverActions: {
      // Prontuário envia até 4 imagens de até 10MB cada no mesmo POST.
      bodySizeLimit: "50mb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        // Sanity CDN — imagens dos artigos do blog
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
    ],
  },
  async headers() {
    const baseHeaders = [
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      {
        // Prevent base-tag injection, form hijacking, and plugin/Flash execution.
        // 'unsafe-inline' retained for Tailwind inline styles and head-scripts.
        // Tighten script-src with nonces in a future hardening pass.
        key: "Content-Security-Policy",
        value: [
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self' https:",
          "frame-ancestors 'none'",
        ].join("; "),
      },
    ];

    const headers = [...baseHeaders];

    if (process.env.NODE_ENV === "production") {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/:path*",
        headers,
      },
    ];
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
