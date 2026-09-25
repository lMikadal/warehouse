import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // 2GiB VPS docker builds: tsc after compile was OOM-killed (137).
  typescript: { ignoreBuildErrors: process.env.SKIP_TYPECHECK === "1" },
};

export default withNextIntl(nextConfig);
