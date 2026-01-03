"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { resetPassword } from "@/actions/auth.actions";
import PasswordField from "@/components/ui/password-field";
import { AlertTriangle, Shield } from "lucide-react";

const resetPasswordSchema = z
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

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
    const params = useParams();
    const router = useRouter();
    const token = params?.token as string;

    if (!token) {
        toast.error("Invalid reset token");
        router.push("/auth/login");
        return;
    }

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordForm token={token} />
        </Suspense>
    );
}

const ResetPasswordForm = ({ token }: { token: string }) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingFormData, setPendingFormData] = useState<ResetPasswordFormValues | null>(null);
    const [status, setStatus] = useState<"loading" | "success" | "error">(
        "loading"
    );
    const [message, setMessage] = useState<string>("");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("Invalid reset token");
        }
    }, [token]);

    const form = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (data: ResetPasswordFormValues) => {
        if (!token) {
            toast.error("Invalid reset token");
            return;
        }

        // Show confirmation dialog before proceeding
        setPendingFormData(data);
        setShowConfirmDialog(true);
    };

    const handleConfirmReset = async () => {
        if (!pendingFormData) return;

        setShowConfirmDialog(false);
        setIsLoading(true);

        try {
            const response = await resetPassword(token, pendingFormData.password);

            if (response.success) {
                setStatus("success");
                setMessage(response.message || "Password reset successfully");
                toast.success(
                    response.message || "Password reset successfully"
                );
                router.push("/auth/login");
            } else {
                setStatus("error");
                setMessage(response.message || "Failed to reset password");
                toast.error(response.message || "Failed to reset password");
            }
        } catch (error) {
            let errorMessage = "Something went wrong";
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            setStatus("error");
            setMessage(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
            setPendingFormData(null);
        }
    };

    return (
        <>
            <div className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold">Reset Password</h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Enter your new password
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

                                    {/* Security notice about encrypted data */}
                                    <div className="flex items-start gap-2 text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
                                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                                        <span>
                                            Resetting your password will make any previously saved
                                            questionnaire responses inaccessible, as they were
                                            encrypted with your old password.
                                        </span>
                                    </div>

                                    {status === "error" && (
                                        <div className="text-red-600 text-sm">
                                            {message}
                                        </div>
                                    )}

                                    {status === "success" && (
                                        <div className="text-green-600 text-sm">
                                            {message}
                                        </div>
                                    )}

                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={isLoading}
                                    >
                                        {isLoading
                                            ? "Resetting password..."
                                            : "Reset password"}
                                    </Button>
                                </form>
                            </Form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-amber-500" />
                            </div>
                            <AlertDialogTitle>Confirm Password Reset</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="pt-4 space-y-3">
                            <p>
                                Your questionnaire responses are encrypted with your password for privacy.
                            </p>
                            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-amber-700 dark:text-amber-400">
                                <strong>Important:</strong> After resetting your password, any previously
                                saved questionnaire responses will become permanently inaccessible.
                                You may need to complete the questionnaire again.
                            </div>
                            <p>
                                Your mental health profile (used for group matching) will be preserved.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmReset}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            I Understand, Reset Password
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
