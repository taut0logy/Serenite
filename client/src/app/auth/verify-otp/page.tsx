"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@apollo/client";
import { signIn } from "next-auth/react";
import { PinInput } from "@/components/ui/pin-input";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Suspense } from "react";
import { VERIFY_OTP, VERIFY_BACKUP_CODE } from "@/graphql/operations";
import { Loader2 } from "lucide-react";

export default function VerifyOtpPage() {
    
    const searchParams = useSearchParams();
    const userId = searchParams?.get("userId");
    const tempToken = searchParams?.get("tempToken");
    const email = searchParams?.get("email");

    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
            <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
        </div>}>
            <VerifyOtpPageContent userId={userId} tempToken={tempToken} email={email} />
        </Suspense>
    );
    
}


const VerifyOtpPageContent = ({ userId, tempToken, email }: { userId: string | undefined | null; tempToken: string | undefined | null; email: string | undefined | null }) => {
    const router = useRouter();
    const [otp, setOtp] = useState("");
    const [backupCode, setBackupCode] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [trustDevice, setTrustDevice] = useState(false);

    const [verifyOtp] = useMutation(VERIFY_OTP);
    const [verifyBackupCode] = useMutation(VERIFY_BACKUP_CODE);

    // Redirect if missing parameters
    useEffect(() => {
        if (!userId || !tempToken || !email) {
            toast.error(
                "Missing required parameters. Please try logging in again."
            );
            router.push("/auth/login");
        }
    }, [userId, tempToken, email, router]);

    const handleVerifyOtp = async () => {
        if (otp.length !== 6) {
            toast.error("Please enter a valid 6-digit code.");
            return;
        }

        setIsVerifying(true);

        try {
            const deviceName = trustDevice
                ? `${
                      window.navigator.userAgent.includes("Mobile")
                          ? "Mobile"
                          : "Desktop"
                  } - ${new Date().toLocaleDateString()}`
                : undefined;

            const deviceType = trustDevice
                ? window.navigator.userAgent
                : undefined;

            const { data } = await verifyOtp({
                variables: {
                    userId,
                    otp,
                    tempToken,
                    trustDevice,
                    deviceName,
                    deviceType,
                },
            });

            const result = data?.verifyOtp;

            if (result?.success) {
                // Store the device token if provided
                if (result.deviceToken) {
                    localStorage.setItem("deviceToken", result.deviceToken);
                }

                // Use NextAuth to create a session by passing the token and userId directly
                const signInResult = await signIn("credentials", {
                    token: result.token,
                    userId: result.user.id,
                    redirect: false,
                });

                if (signInResult?.error) {
                    toast.error(
                        "Failed to create session. Please try logging in again."
                    );
                    router.push("/auth/login");
                    return;
                }

                toast.success(
                    "Successfully verified. Redirecting to dashboard..."
                );
                router.push("/dashboard");
            } else {
                toast.error(
                    result?.message || "Failed to verify OTP. Please try again."
                );
            }
        } catch (error) {
            toast.error("An error occurred. Please try again.");
            console.error("Error verifying OTP:", error);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleVerifyBackupCode = async () => {
        if (!backupCode) {
            toast.error("Please enter a backup code.");
            return;
        }

        setIsVerifying(true);

        try {
            const deviceName = trustDevice
                ? `${
                      window.navigator.userAgent.includes("Mobile")
                          ? "Mobile"
                          : "Desktop"
                  } - ${new Date().toLocaleDateString()}`
                : undefined;

            const deviceType = trustDevice
                ? window.navigator.userAgent
                : undefined;

            const { data } = await verifyBackupCode({
                variables: {
                    userId,
                    backupCode,
                    tempToken,
                    trustDevice,
                    deviceName,
                    deviceType,
                },
            });

            const result = data?.verifyBackupCode;

            if (result?.success) {
                // Store the device token if provided
                if (result.deviceToken) {
                    localStorage.setItem("deviceToken", result.deviceToken);
                }

                // Use NextAuth to create a session by passing the token and userId directly
                const signInResult = await signIn("credentials", {
                    token: result.token,
                    userId: result.user.id,
                    redirect: false,
                });

                if (signInResult?.error) {
                    toast.error(
                        "Failed to create session. Please try logging in again."
                    );
                    router.push("/auth/login");
                    return;
                }

                toast.success(
                    "Successfully verified with backup code. Redirecting to dashboard..."
                );
                router.push("/dashboard");
            } else {
                toast.error(
                    result?.message ||
                        "Failed to verify backup code. Please try again."
                );
            }
        } catch (error) {
            toast.error("An error occurred. Please try again.");
            console.error("Error verifying backup code:", error);
        } finally {
            setIsVerifying(false);
        }
    };

    if (!userId || !tempToken || !email) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <p className="text-red-500">Missing required parameters.</p>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center py-8 sm:py-12 md:py-16 lg:py-20 xl:py-24 2xl:py-28 px-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Two-Factor Authentication</CardTitle>
                    <CardDescription>
                        For added security, please enter the verification code
                        sent to your email.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="otp">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="otp">Email Code</TabsTrigger>
                            <TabsTrigger value="backup">
                                Backup Code
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="otp">
                            <CardContent className="pt-6">
                                <div className="flex flex-col space-y-4">
                                    <div className="space-y-2">
                                        <Label>
                                            Enter the 6-digit code sent to your
                                            email
                                        </Label>
                                        <div className="flex justify-center py-4">
                                            <PinInput
                                                length={6}
                                                onComplete={(value) =>
                                                    setOtp(value)
                                                }
                                                disabled={isVerifying}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 pt-2">
                                        <Checkbox
                                            id="trust-device"
                                            checked={trustDevice}
                                            onCheckedChange={(checked) =>
                                                setTrustDevice(checked === true)
                                            }
                                        />
                                        <Label
                                            htmlFor="trust-device"
                                            className="text-sm text-muted-foreground cursor-pointer"
                                        >
                                            Trust this device for 30 days
                                        </Label>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    className="w-full mt-4"
                                    onClick={handleVerifyOtp}
                                    disabled={isVerifying || otp.length !== 6}
                                >
                                    {isVerifying
                                        ? "Verifying..."
                                        : "Verify Code"}
                                </Button>
                            </CardFooter>
                        </TabsContent>

                        <TabsContent value="backup">
                            <CardContent className="pt-6">
                                <div className="flex flex-col space-y-4">
                                    <div className="space-y-2">
                                        <Label>
                                            Enter one of your backup codes
                                        </Label>
                                        <Input
                                            placeholder="Enter backup code"
                                            value={backupCode}
                                            onChange={(e) =>
                                                setBackupCode(e.target.value)
                                            }
                                            disabled={isVerifying}
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Use one of the backup codes provided
                                            when you set up two-factor
                                            authentication.
                                        </p>
                                    </div>

                                    <div className="flex items-center space-x-2 pt-2">
                                        <Checkbox
                                            id="trust-device-backup"
                                            checked={trustDevice}
                                            onCheckedChange={(checked) =>
                                                setTrustDevice(checked === true)
                                            }
                                        />
                                        <Label
                                            htmlFor="trust-device-backup"
                                            className="text-sm text-muted-foreground cursor-pointer"
                                        >
                                            Trust this device for 30 days
                                        </Label>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    className="w-full mt-4"
                                    onClick={handleVerifyBackupCode}
                                    disabled={isVerifying || !backupCode}
                                >
                                    {isVerifying
                                        ? "Verifying..."
                                        : "Verify Backup Code"}
                                </Button>
                            </CardFooter>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}