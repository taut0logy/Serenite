"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { forgotPassword } from "@/actions/auth.actions";

const forgotPasswordSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submittedEmail, setSubmittedEmail] = useState("");

    const form = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: "",
        },
    });

    const onSubmit = async (data: ForgotPasswordFormValues) => {
        setIsLoading(true);

        try {
            const response = await forgotPassword(data.email);

            if (response.success) {
                setSubmittedEmail(data.email);
                setSubmitted(true);
            } else {
                toast.error(response.message || "Failed to send reset link");
            }
        } catch (error) {
            let errorMessage = "Something went wrong";
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Success state — show confirmation instead of the form
    if (submitted) {
        return (
            <div className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
                <div className="w-full max-w-md space-y-8 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <CheckCircle2 className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold">Check your inbox</h1>
                    <p className="text-sm text-muted-foreground">
                        If an account exists for <strong>{submittedEmail}</strong>, we&apos;ve sent a
                        password reset link. It expires in 24 hours.
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Didn&apos;t receive it? Check your spam folder or try again.
                    </p>
                    <div className="flex flex-col gap-3">
                        <Link href="/auth/login">
                            <Button className="w-full">Back to sign in</Button>
                        </Link>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setSubmitted(false)}
                        >
                            Try a different email
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold">Forgot Password</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Enter your email to receive a password reset link
                    </p>
                </div>

                <div className="mt-8">
                    <div className="space-y-6">
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-4"
                            >
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="email"
                                                    placeholder="name@example.com"
                                                    disabled={isLoading}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Remove the old status blocks, errors shown via toast */}

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isLoading}
                                >
                                    {isLoading
                                        ? "Sending reset link..."
                                        : "Send reset link"}
                                </Button>
                            </form>
                        </Form>

                        <div className="text-center text-sm">
                            Remember your password?{" "}
                            <Link
                                href="/auth/login"
                                className="text-primary hover:underline"
                            >
                                Sign in
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
