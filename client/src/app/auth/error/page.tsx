"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MdErrorOutline } from "react-icons/md";
import { Suspense } from "react";

function AuthErrorContent() {
    const searchParams = useSearchParams();
    const error = searchParams?.get("error");

    const errorMessages: Record<string, string> = {
        default: "An error occurred during authentication.",
        configuration: "There is a problem with the server configuration.",
        accessdenied: "You do not have permission to sign in.",
        verification: "The verification link is invalid or has expired.",
        oauthsignin: "Error signing in with OAuth provider.",
        oauthcallback: "Error signing in with OAuth provider.",
        oauthcreateaccount: "Error creating account with OAuth provider.",
        emailcreateaccount: "Error creating account with email provider.",
        callback: "Error during callback processing.",
        oauthaccountnotlinked:
            "This email is already associated with another account.",
        sessionrequired: "Please sign in to access this page.",
    };

    const errorMessage = error
        ? errorMessages[error] || errorMessages.default
        : errorMessages.default;

    return (
        <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                        <MdErrorOutline className="h-8 w-8 text-destructive" />
                    </div>
                    <h1 className="mt-6 text-3xl font-bold">
                        Authentication Error
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {errorMessage}
                    </p>
                </div>

                <div className="flex flex-col mt-8 space-y-4 gap-4">
                    <Link href="/auth/login">
                        <Button className="w-full">Try signing in again</Button>
                    </Link>

                    <Link href="/">
                        <Button variant="outline" className="w-full">
                            Return to home
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function AuthErrorPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            }
        >
            <AuthErrorContent />
        </Suspense>
    );
}
