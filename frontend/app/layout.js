"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 text-gray-900 min-h-screen relative overflow-x-hidden`}
        suppressHydrationWarning
      >
        <div className="fixed inset-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-emerald-300 via-teal-300 to-cyan-300 rounded-full filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-to-br from-emerald-300 via-teal-300 to-cyan-300 rounded-full filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-gradient-to-br from-emerald-300 via-teal-300 to-cyan-300 rounded-full filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="app-wrapper flex flex-col min-h-screen">
          <AuthProvider>
            <main className="flex-grow">{children}</main>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
