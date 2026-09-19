import type { Metadata } from "next";
import { Press_Start_2P, JetBrains_Mono } from "next/font/google";
import { UserProvider } from "@/components/providers/user-provider";
import "./globals.css";

const pixelFont = Press_Start_2P({
  variable: "--font-press-start",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const monoFont = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arcade Vault",
  description:
    "Plataforma para jugar online y competir por la mayor cantidad de puntos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${pixelFont.variable} ${monoFont.variable}`}
    >
      <body>
        <UserProvider>
          <div className="av-bg" aria-hidden="true" />
          <div className="av-noise" aria-hidden="true" />
          <main className="av-main">{children}</main>
        </UserProvider>
      </body>
    </html>
  );
}
