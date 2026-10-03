import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/shared/sw-register";
import { TimezoneSync } from "@/components/shared/timezone-sync";
import { getThemePreference, SYSTEM_THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kochi",
  description: "Your training log, plan and progress in one place",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kochi",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#14171c" },
    { media: "(prefers-color-scheme: light)", color: "#ebe5d1" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getThemePreference();

  return (
    // The system-theme script rewrites the class before hydration
    <html lang="en" data-theme={theme} className={`${theme === "system" ? "" : theme} h-full antialiased`} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        {theme === "system" && <script dangerouslySetInnerHTML={{ __html: SYSTEM_THEME_SCRIPT }} />}
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" theme={theme} />
        <ServiceWorkerRegister />
        <TimezoneSync />
      </body>
    </html>
  );
}
