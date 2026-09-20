import type { Metadata } from "next";
import { Manrope, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Pecel DMS — Sales & Product Monitoring",
  description: "Sistem manajemen distribusi & pemantauan sales untuk produsen pecel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${manrope.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-surface-page font-sans text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
