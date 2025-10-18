"use client";

import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import ApolloWrapper from "@/providers/apollo-provider";
import { SocketProvider } from "@/providers/socket-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";

export default function Providers({ children }: { children: ReactNode }) {
    return (
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
                            {children}
                            <Toaster
                                toastOptions={{
                                    className: "sonner",
                                    style: {
                                        fontFamily: "var(--geist-font-mono)",
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
    );
}
