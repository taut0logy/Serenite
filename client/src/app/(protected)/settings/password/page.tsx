"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSession, signOut } from "next-auth/react";
import { changePasswordWithReencryption, changePassword } from "@/actions/auth.actions";
import { getEncryptedResponses } from "@/actions/questionnaire.actions";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
    decryptResponses,
    encryptResponses,
    arrayBufferToBase64,
    base64ToArrayBuffer,
    base64ToUint8Array,
} from "@/lib/encryption";

const passwordFormSchema = z
    .object({
        currentPassword: z
            .string()
            .min(6, "Password must be at least 6 characters"),
        newPassword: z
            .string()
            .min(6, "Password must be at least 6 characters"),
        confirmPassword: z
            .string()
            .min(6, "Password must be at least 6 characters"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    });

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function PasswordChangePage() {
    const { data: session } = useSession();
    const userId = session?.user?.id;
    const [isPending, startTransition] = useTransition();
    const [reencryptionStatus, setReencryptionStatus] = useState<string | null>(null);
    const router = useRouter();

    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordFormSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    const onPasswordSubmit = async (data: PasswordFormValues) => {
        if (!userId) {
            toast.error("User not found");
            return;
        }

        startTransition(async () => {
            try {
                // Check if user has encrypted questionnaire responses
                setReencryptionStatus("Checking for encrypted data...");
                const encryptedResult = await getEncryptedResponses();

                if (encryptedResult.success && encryptedResult.data?.encryptedData) {
                    // User has encrypted responses - need to re-encrypt
                    setReencryptionStatus("Decrypting responses with current password...");

                    try {
                        // Decrypt with old password
                        const encrypted = base64ToArrayBuffer(encryptedResult.data.encryptedData);
                        const iv = base64ToUint8Array(encryptedResult.data.iv);
                        const salt = base64ToUint8Array(encryptedResult.data.salt);

                        const responses = await decryptResponses(
                            encrypted,
                            iv,
                            salt,
                            data.currentPassword
                        );

                        setReencryptionStatus("Re-encrypting with new password...");

                        // Re-encrypt with new password
                        const reencrypted = await encryptResponses(responses, data.newPassword);
                        const reencryptedBase64 = arrayBufferToBase64(reencrypted.encrypted);
                        const newIvBase64 = arrayBufferToBase64(reencrypted.iv.buffer as ArrayBuffer);
                        const newSaltBase64 = arrayBufferToBase64(reencrypted.salt.buffer as ArrayBuffer);

                        setReencryptionStatus("Updating password and encrypted data...");

                        // Change password with re-encrypted data
                        const result = await changePasswordWithReencryption(
                            userId,
                            data.currentPassword,
                            data.newPassword,
                            reencryptedBase64,
                            newIvBase64,
                            newSaltBase64
                        );

                        if (result.success) {
                            toast.success("Password changed and data re-encrypted successfully");
                            passwordForm.reset();
                            await signOut({ redirect: false });
                            router.push("/auth/login");
                        } else {
                            toast.error(result.message || "Failed to change password");
                        }
                    } catch (decryptError) {
                        // Decryption failed - just proceed with password change without re-encryption
                        // Old encrypted data will become orphaned (undecryptable)
                        console.warn("Decryption failed, proceeding without re-encryption:", decryptError);
                        setReencryptionStatus("Updating password...");

                        const result = await changePassword(
                            userId,
                            data.currentPassword,
                            data.newPassword
                        );

                        if (result.success) {
                            toast.success("Password changed successfully. Note: Previously saved questionnaire responses may be inaccessible.");
                            passwordForm.reset();
                            await signOut({ redirect: false });
                            router.push("/auth/login");
                        } else {
                            toast.error(result.message || "Failed to change password");
                        }
                    }
                } else {
                    // No encrypted responses - just change password normally
                    setReencryptionStatus(null);
                    const result = await changePassword(
                        userId,
                        data.currentPassword,
                        data.newPassword
                    );

                    if (result.success) {
                        toast.success(result.message || "Password changed successfully");
                        passwordForm.reset();
                        await signOut({ redirect: false });
                        router.push("/auth/login");
                    } else {
                        toast.error(result.message || "Failed to change password");
                    }
                }
            } catch (error) {
                console.error("Password change error:", error);
                toast.error("Something went wrong while changing your password");
            } finally {
                setReencryptionStatus(null);
            }
        });
    };

    return (
        <div className="container py-10 px-4 mx-auto">
            <div className="flex items-center gap-2 mb-6">
                <Link
                    href="/settings"
                    className="text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-8 w-8" />
                </Link>
                <h1 className="text-3xl font-bold">Security Settings</h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Password & Security</CardTitle>
                    <CardDescription>
                        Update your password and manage your account security.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...passwordForm}>
                        <form
                            onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                            className="space-y-4"
                        >
                            <FormField
                                control={passwordForm.control}
                                name="currentPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Current Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="Enter your current password"
                                                disabled={isPending}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={passwordForm.control}
                                name="newPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>New Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="Enter your new password"
                                                disabled={isPending}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={passwordForm.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirm Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="Confirm your new password"
                                                disabled={isPending}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Re-encryption status indicator */}
                            {reencryptionStatus && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                                    <Shield className="w-4 h-4 animate-pulse" />
                                    <span>{reencryptionStatus}</span>
                                </div>
                            )}

                            {/* Security notice */}
                            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>
                                    Your questionnaire responses are encrypted with your password.
                                    When you change your password, they will be automatically re-encrypted.
                                </span>
                            </div>

                            <div className="pt-4">
                                <Button type="submit" disabled={isPending}>
                                    {isPending
                                        ? reencryptionStatus || "Updating Password..."
                                        : "Change Password"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
