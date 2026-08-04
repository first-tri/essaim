import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "F-HDAC — Tour de France en avion",
  description: "Suivi en direct du tour de France en Diamond DA20, immatriculation F-HDAC.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} ${display.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="h-full overflow-hidden bg-background text-foreground">{children}</body>
    </html>
  );
}
