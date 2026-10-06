import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "../components/providers/SessionProvider"; // <-- IMPORTA ESTO

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Olimpiadas Colegio",
  description: "Sistema de gestión deportiva escolar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}