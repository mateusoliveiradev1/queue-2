import type { Metadata } from "next";
import type { ReactNode } from "react";
import { QueueToaster } from "@queue/ui";

import "./globals.css";
import { WebVitalsReporter } from "../components/web-vitals-reporter";
import { siteDescription, siteName, siteOrigin, siteTagline } from "./seo";

export const metadata: Metadata = {
  applicationName: siteName,
  authors: [{ name: siteName }],
  creator: siteName,
  description: siteDescription,
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg"
  },
  keywords: [
    "jogos coop",
    "backlog de jogos",
    "jogos cooperativos",
    "fila de jogos",
    "dupla gamer",
    "QUEUE/2"
  ],
  metadataBase: new URL(siteOrigin),
  openGraph: {
    description: siteDescription,
    locale: "pt_BR",
    siteName: "QUEUE/2",
    title: `${siteName} | ${siteTagline}`,
    type: "website",
    url: "/"
  },
  publisher: siteName,
  title: {
    default: `${siteName} | ${siteTagline}`,
    template: `%s - ${siteName}`
  },
  twitter: {
    card: "summary_large_image",
    description: siteDescription,
    title: `${siteName} | ${siteTagline}`
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="queue2-theme">
        {children}
        <WebVitalsReporter />
        <QueueToaster />
      </body>
    </html>
  );
}
