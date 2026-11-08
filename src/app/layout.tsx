import type { Metadata } from "next";
import "./globals.css";
import "./portal-reference.css";
import "./portal-experience.css";
import "./portal-themes.css";
import "./portal-advertising.css";
import "./admin-premium.css";
import "./portal-widgets.css";
import "./portal-header.css";
export const metadata: Metadata = {
  title: "Influente CMS",
  description: "Central editorial privada da Influente Comunicação",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
