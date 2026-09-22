import type { Metadata } from "next";
import "./globals.css";
import TelemetryBar from "../components/TelemetryBar";
import { RoleProvider } from "../context/RoleContext";
import RoleLockModal from "../components/RoleLockModal";

export const metadata: Metadata = {
  title: "LEXVAULT | Digital Forensics Command Center",
  description: "Tamper-evident digital evidence operations and chain-of-custody intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fira+Code:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <RoleProvider>
          <TelemetryBar />
          {children}
          <RoleLockModal />
        </RoleProvider>
      </body>
    </html>
  );
}