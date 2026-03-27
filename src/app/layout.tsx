import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/layout/sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Challenger Industries — Invoice Manager",
  description: "Invoice management for Challenger Industries",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="h-full bg-background text-foreground" suppressHydrationWarning>
        <TooltipProvider>
          <div className="flex h-full">
            <Sidebar />
            <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
              <div className="mx-auto max-w-6xl p-6">
                {children}
              </div>
            </main>
          </div>
        </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
