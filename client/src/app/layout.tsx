import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// SessionProvider moved into AuthProvider (client) to keep this layout as a Server Component
import Providers from "@/providers/Providers";
import { Navbar } from "@/components/navigation/navbar";
import "react-datepicker/dist/react-datepicker.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Serenite",
    description: "A professional video conferencing application",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning data-lk-theme="default">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
                suppressHydrationWarning
            >
                <Providers>
                    <div className="flex flex-col min-h-screen">
                        <Navbar />
                        <main className="flex-1">{children}</main>
                    </div>
                </Providers>
            </body>
        </html>
    );
}
