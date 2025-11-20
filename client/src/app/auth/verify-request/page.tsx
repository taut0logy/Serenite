"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MdOutlineEmail } from "react-icons/md";
import { z } from "zod";
import { toast } from "sonner";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { resendVerificationEmail } from "@/actions/auth.actions";
import { useState } from "react";

const verifyRequestSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
});

type VerifyRequestFormValues = z.infer<typeof verifyRequestSchema>;

export default function VerifyRequestPage() {
    const [loading, setLoading] = useState(false);

    const form = useForm<VerifyRequestFormValues>({
        resolver: zodResolver(verifyRequestSchema),
        defaultValues: {
            email: "",
        },
    });

    const handleResendVerificationEmail = async (
        data: VerifyRequestFormValues
    ) => {
        setLoading(true);
        try {
            const response = await resendVerificationEmail(data.email);

            if (response.success) {
                toast.success(response.message || "Verification email sent");
            } else {
                toast.error(
                    response.message || "Failed to resend verification email"
                );
            }
        } catch (error) {
            console.error("Error resending verification email:", error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex items-center justify-center px-4 py-auto sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <MdOutlineEmail className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="mt-6 text-3xl font-bold">
                        Check your email
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        We&apos;ve sent you a verification link. Please check
                        your email to verify your account.
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    <div className="">
                        <p className="text-xl text-center font-bold mb-4">
                            Didn&apos;t receive an email?
                        </p>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(
                                    handleResendVerificationEmail
                                )}
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
                                                    placeholder="your@email.com"
                                                    {...field}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <div className="flex items-center mt-4 gap-4">
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1"
                                    >
                                        {loading
                                            ? "Sending..."
                                            : "Resend email"}
                                    </Button>
                                    <Link href="/auth/login" className="flex-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full"
                                        >
                                            Back to sign in
                                        </Button>
                                    </Link>
                                </div>
                            </form>
                        </Form>
                    </div>
                </div>
            </div>
        </div>
    );
}
