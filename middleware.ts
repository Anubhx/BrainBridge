import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// All /dashboard, /history, /settings, /research routes require authentication
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/history(.*)",
  "/settings(.*)",
  "/research(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Clerk auto-proxy path
    "/__clerk/:path*",
  ],
};
