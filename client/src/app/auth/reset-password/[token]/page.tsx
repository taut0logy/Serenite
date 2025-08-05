"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@apollo/client";
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
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RESET_PASSWORD } from "@/graphql/operations";

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
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
  )
  
}

const ResetPasswordForm = ({ token }: { token: string }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [resetPassword] = useMutation(RESET_PASSWORD);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
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

    setIsLoading(true);
    
    try {
      const { data: responseData } = await resetPassword({
        variables: {
          token,
          password: data.password,
        },
      });

      // Extract the response from the array that's returned by the server
      const response = responseData?.resetPassword || {};
      
      if (response.success) {
        setStatus("success");
        setMessage(response.message || "Password reset successfully");
        toast.success(response.message || "Password reset successfully");
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
    }
  };

  return (
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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      <FormLabel>Confirm New Password</FormLabel>
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
                  {isLoading ? "Resetting password..." : "Reset password"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
} 
