import type { Metadata } from "next";
import type { ReactNode } from "react";

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
      <body
        style={{
          margin: 0,
          background: "oklch(0.16 0.025 285)",
          color: "oklch(0.96 0.015 95)",
          fontFamily:
            '"Inter Tight", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        }}
      >
        {children}
      </body>
    </html>
  );
}
