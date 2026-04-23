import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Only run on the root and public marketing pages.
  // Excludes: _next, api, auth routes, protected routes, admin, static assets.
  matcher: [
    "/",
    "/(pt|en|es)/:path*",
  ],
};
