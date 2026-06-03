import type { Metadata } from "next";
import type { ReactNode } from "react";
import { QueueToaster } from "@queue/ui";

import "./globals.css";

export const metadata: Metadata = {
  title: "QUEUE/2",
  description: "A fila e nossa. Descubram, sorteiem e zerem coops juntos.",
  openGraph: {
    siteName: "QUEUE/2",
    type: "website",
    title: "QUEUE/2",
    description: "A fila e nossa. Descubram, sorteiem e zerem coops juntos."
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
        <QueueToaster />
      </body>
    </html>
  );
}
