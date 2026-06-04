import type { Metadata } from "next";
import type { ReactNode } from "react";

import { noIndexRobots } from "../seo";

export const metadata: Metadata = {
  robots: noIndexRobots
};

export default function AuthenticatedAppLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}
