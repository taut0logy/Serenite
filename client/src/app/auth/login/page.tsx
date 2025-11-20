"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { signIn } from "next-auth/react";

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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import PasswordField from "@/components/ui/password-field";
import { check2FARequired } from "@/actions/auth.actions";

const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onSubmit(data: LoginFormValues) {
        if (isLoading) {
            return;
        }

        setIsLoading(true);

        try {
            // Get device token from localStorage if available
            const deviceToken =
                typeof window !== "undefined"
                    ? localStorage.getItem("deviceToken")
                    : null;

            // First, check if 2FA is required BEFORE calling signIn
            const checkResult = await check2FARequired(
                data.email,
                data.password,
                deviceToken || undefined
            );

            // If 2FA check failed (invalid credentials), show error
            if (!checkResult.success) {
                toast.error("Invalid email or password");
                setIsLoading(false);
                return;
            }

            // If 2FA is required, redirect to OTP page
            if (
                checkResult.requiresTwoFactor &&
                checkResult.userId &&
                checkResult.tempToken
            ) {
                toast.info("Two-factor authentication required");
                router.push(
                    `/auth/verify-otp?userId=${checkResult.userId}&tempToken=${checkResult.tempToken}&email=${data.email}`
                );
                return;
            }

            // If we have a token, user is authenticated (no 2FA needed)
            // Now sign them in with NextAuth using the token
            if (checkResult.token) {
                const result = await signIn("credentials", {
                    token: checkResult.token,
                    userId: checkResult.userId,
                    redirect: false,
                });

                if (result?.error) {
                    toast.error("An error occurred during login");
                    setIsLoading(false);
                    return;
                }

                // Login successful
                toast.success("Logged in successfully");
                router.push("/dashboard");
                return;
            }

            // Shouldn't reach here, but handle gracefully
            toast.error("An unexpected error occurred");
            setIsLoading(false);
        } catch (error) {
            console.error("Login error:", error);
            toast.error("Something went wrong");
            setIsLoading(false);
        }
    }

    const handleOAuthSignIn = (provider: "github" | "google") => {
        try {
            signIn(provider, { callbackUrl: "/dashboard" });
        } catch (error) {
            console.error(`${provider} login error:`, error);
            toast.error(`Error signing in with ${provider}`);
        }
    };

    return (
        <div className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold">Welcome back</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Sign in to your account
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
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Password</FormLabel>
                                            <FormControl>
                                                <PasswordField field={field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex items-center justify-between">
                                    <div className="text-sm">
                                        <Link
                                            href="/auth/forgot-password"
                                            className="text-sm text-primary hover:underline"
                                        >
                                            Forgot password?
                                        </Link>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Signing in..." : "Sign in"}
                                </Button>
                            </form>
                        </Form>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <Separator className="w-full" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => handleOAuthSignIn("github")}
                                disabled={isLoading}
                            >
                                <FaGithub className="mr-2 h-4 w-4" /> GitHub
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 items-center justify-center"
                                onClick={() => handleOAuthSignIn("google")}
                                disabled={isLoading}
                            >
                                <FcGoogle className="mr-2 h-4 w-4" /> Google
                            </Button>
                        </div>

                        <div className="text-center text-sm">
                            Don&apos;t have an account?{" "}
                            <Link
                                href="/auth/register"
                                className="text-primary hover:underline"
                            >
                                Sign up
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
