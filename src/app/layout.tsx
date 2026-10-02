import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/shared/sw-register";
import { TimezoneSync } from "@/components/shared/timezone-sync";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gym Ledger",
  description: "Track your gym attendance, workouts, and body metrics",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gym Ledger",
  },
};

export const viewport: Viewport = {
  themeColor: "#252330",
  width: "device-width",
  initialScale: 1,
  // maximumScale keeps iOS from auto-zooming into small inputs; pinch-zoom stays available.
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <head>
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" richColors />
        <ServiceWorkerRegister />
        <TimezoneSync />
      </body>
    </html>
  );
}
