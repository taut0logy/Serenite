import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import ApolloWrapper from "@/providers/apollo-provider";
import { SocketProvider } from "@/providers/socket-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/navigation/navbar";
import "react-datepicker/dist/react-datepicker.css";
import { Footer } from "@/components/footer";

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
                <SessionProvider>
                    <AuthProvider>
                        <ApolloWrapper>
                            <SocketProvider>
                                    <ThemeProvider
                                        attribute="class"
                                        defaultTheme="system"
                                        enableSystem
                                        disableTransitionOnChange
                                    >
                                        <div className="flex flex-col min-h-screen">
                                            <Navbar />
                                            <main className="flex-1">
                                                {children}
                                            </main>
                                            <Footer />
                                        </div>
                                        <Toaster
                                            toastOptions={{
                                                className: "sonner",
                                                style: {
                                                    fontFamily:
                                                        "var(--geist-font-mono)",
                                                    fontSize: "0.875rem",
                                                    lineHeight: "1.25rem",
                                                },
                                            }}
                                            closeButton
                                            richColors
                                        />
                                    </ThemeProvider>
                            </SocketProvider>
                        </ApolloWrapper>
                    </AuthProvider>
                </SessionProvider>
            </body>
        </html>
    );
}
