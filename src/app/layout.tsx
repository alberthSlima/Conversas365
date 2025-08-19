import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { HubProvider } from "@/components/HubProvider";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Chat365",
  description: "Relatório de mensagens da Medeiros365",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${poppins.variable} antialiased`}>
        <HubProvider>{children}</HubProvider>
      </body>
    </html>
  );
}
