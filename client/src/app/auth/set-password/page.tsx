"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@apollo/client";
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
import { SET_PASSWORD } from "@/graphql/operations";
import { useAuth } from "@/hooks/use-auth";

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
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [setPassword] = useMutation(SET_PASSWORD);
    const [status, setStatus] = useState<"loading" | "success" | "error">(
        "loading"
    );
    const [message, setMessage] = useState<string>("");

    const { user } = useAuth();

    const form = useForm<SetPasswordFormValues>({
        resolver: zodResolver(setPasswordSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (data: SetPasswordFormValues) => {
        setIsLoading(true);

        try {
            const { data: responseData } = await setPassword({
                variables: {
                    userId: user?.id,
                    password: data.password,
                },
            });

            // Extract the response from the array that's returned by the server
            const response = responseData?.setPassword || {};

            if (response.success) {
                setStatus("success");
                setMessage(response.message || "Password set successfully");
                toast.success(response.message || "Password set successfully");
                router.push("/auth/login");
            } else {
                setStatus("error");
                setMessage(response.message || "Failed to set password");
                toast.error(response.message || "Failed to set password");
            }
        } catch (error) {
            setStatus("error");
            let message = "Something went wrong";

            if (error instanceof Error) {
                message = error.message;
            }

            setMessage(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold">Set a Password</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Welcome! Please set a new password for your account.
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
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
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
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Confirm New Password
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    disabled={isLoading}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {status === "error" && (
                                    <div className="text-red-500 text-sm">
                                        {message}
                                    </div>
                                )}

                                {status === "success" && (
                                    <div className="text-green-500 text-sm">
                                        {message}
                                    </div>
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
    );
};
