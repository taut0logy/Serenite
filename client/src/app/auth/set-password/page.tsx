"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { setPassword } from "@/actions/auth.actions";
import { useAuth } from "@/providers/auth-provider";
import PasswordField from "@/components/ui/password-field";
import { useRefreshSession } from "@/lib/session-utils";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";
import { useEncryption } from "@/providers/encryption-provider";
import SafeWordDisplay from "@/components/questionnaire/SafeWordDisplay";


const setPasswordSchema = z
    .object({
        password: z.string().min(6, "Password must be at least 6 characters"),
        confirmPassword: z
            .string()
            .min(6, "Confirm password must be at least 6 characters"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

type SetPasswordFormValues = z.infer<typeof setPasswordSchema>;

export default function SetPasswordPage() {
    return <SetPasswordForm />;
}

const SetPasswordForm = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [safeWords, setSafeWords] = useState<string[] | null>(null);

    const { user } = useAuth();
    const { refreshSession } = useRefreshSession();
    const { setupNewKey } = useEncryption();
    const router = useRouter();

    const form = useForm<SetPasswordFormValues>({
        resolver: zodResolver(setPasswordSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (data: SetPasswordFormValues) => {
        if (!user?.id) {
            toast.error("User not found. Please log in again.");
            return;
        }

        setIsLoading(true);

        try {
            const response = await setPassword(user.id, data.password);

            if (response.success) {
                // Generate Master Key and safe words
                const result = await setupNewKey(data.password);
                setSafeWords(result.safeWords);
                // Refresh session in background — navigation happens after user confirms safe words
                await refreshSession();
                toast.success(response.message || "Password set successfully");
            } else {
                setErrorMsg(response.message || "Failed to set password");
                toast.error(response.message || "Failed to set password");
            }
        } catch (error) {
            let msg = "Something went wrong";
            if (error instanceof Error) msg = error.message;
            setErrorMsg(msg);
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Safe phrase modal — shown after password is set (blocks navigation) */}
            {safeWords && (
                <SafeWordDisplay
                    words={safeWords}
                    onConfirmed={() => router.push('/dashboard')}
                    asDialog
                />
            )}

            <div className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold">Set a Password</h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Welcome! Please set a password for your account.
                        </p>
                    </div>

                    {/* Context callout for social auth users */}
                    <div className="flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-700 dark:text-blue-400">
                        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>
                            You signed up with a social account. Setting a password lets you log in
                            with email and enables sensitive actions like changing your email or
                            enabling two-factor authentication.
                        </span>
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
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>New Password</FormLabel>
                                                <FormControl>
                                                    <PasswordField field={field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="confirmPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Confirm New Password
                                                </FormLabel>
                                                <FormControl>
                                                    <PasswordField field={field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {errorMsg && (
                                        <p className="text-sm text-red-500">{errorMsg}</p>
                                    )}

                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={isLoading}
                                    >
                                        {isLoading
                                            ? "Setting password..."
                                            : "Set password"}
                                    </Button>
                                </form>
                            </Form>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

};
