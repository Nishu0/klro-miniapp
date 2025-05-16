import type { Metadata } from "next";

import { getSession } from "~/auth"
import "~/app/globals.css";
import { Providers } from "~/app/providers";
import { APP_NAME, APP_DESCRIPTION } from "~/lib/constants";
import { Geist, Geist_Mono } from "next/font/google";
import { MiniKitContextProvider } from "~/providers/MiniKitProvider";
import { ThemeProvider } from "~/providers/theme-provider";
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {  
  const session = await getSession()

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen dark`}
      >
        <ThemeProvider>
        <MiniKitContextProvider>
          <Providers session={session}>
            {children}
            <Analytics />
          </Providers>
        </MiniKitContextProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
