"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { MdCheckCircleOutline, MdErrorOutline } from "react-icons/md";
import { verifyEmail } from "@/actions/auth.actions";

export default function VerifyEmailPage() {
    const params = useParams();
    const token = params?.token as string;

    return (
        <Suspense fallback={<Fallback />}>
            <VerifyEmailContent token={token} />
        </Suspense>
    );
}

const Fallback = () => {
    return (
        <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        </div>
    );
};

const VerifyEmailContent = ({ token }: { token: string }) => {
    const router = useRouter();
    const [status, setStatus] = useState<"loading" | "success" | "error">(
        "loading"
    );
    const [message, setMessage] = useState<string>("");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("Invalid verification token");
            return;
        }

        const verifyToken = async () => {
            try {
                const response = await verifyEmail(token);

                if (response.success) {
                    setStatus("success");
                    setMessage(
                        response.message || "Email verified successfully"
                    );
                    router.push("/auth/login");
                } else {
                    setStatus("error");
                    setMessage(response.message || "Failed to verify email");
                }
            } catch (error) {
                let errorMessage = "Something went wrong";
                if (error instanceof Error) {
                    errorMessage = error.message;
                }
                setStatus("error");
                setMessage(errorMessage);
            }
        };

        verifyToken();
    }, [token, router]);

    return (
        <div className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    {status === "loading" && (
                        <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    )}

                    {status === "success" && (
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                            <MdCheckCircleOutline className="h-8 w-8 text-primary" />
                        </div>
                    )}

                    {status === "error" && (
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                            <MdErrorOutline className="h-8 w-8 text-destructive" />
                        </div>
                    )}

                    <h1 className="mt-6 text-3xl font-bold">
                        {status === "loading" && "Verifying your email..."}
                        {status === "success" && "Email verified!"}
                        {status === "error" && "Verification failed"}
                    </h1>

                    <p className="mt-2 text-sm text-muted-foreground">
                        {message}
                    </p>
                </div>

                <div className="mt-8 space-y-4">
                    {status !== "loading" && (
                        <Link href="/auth/login">
                            <Button className="w-full">
                                {status === "success"
                                    ? "Sign in"
                                    : "Back to sign in"}
                            </Button>
                        </Link>
                    )}

                    {status === "error" && (
                        <Link href="/">
                            <Button variant="outline" className="w-full">
                                Return to home
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
};
