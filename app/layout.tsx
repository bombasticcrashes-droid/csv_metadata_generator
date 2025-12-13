import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/context/ThemeProvider";
import { ResultsProvider } from "@/app/context/ResultsContext";
import { ApiKeyProvider } from "@/app/context/ApiKeyContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Adobe Stock CSV Generator",
  description: "Generate Adobe Stock metadata using Gemini AI",
  icons: {
    icon: '/static/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <ApiKeyProvider>
            <ResultsProvider>
              {children}
            </ResultsProvider>
          </ApiKeyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
