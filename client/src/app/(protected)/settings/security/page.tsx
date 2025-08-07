"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery } from "@apollo/client";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    AlertCircle,
    CheckCircle,
    Shield,
    LockKeyhole,
    ArrowLeft,
    RefreshCw,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import {
    ENABLE_TWO_FACTOR,
    DISABLE_TWO_FACTOR,
    REGENERATE_BACKUP_CODES,
    REMOVE_TRUSTED_DEVICE,
    GET_TWO_FACTOR_STATUS,
    GET_BACKUP_CODES,
    GET_TRUSTED_DEVICES,
} from "@/graphql/operations";
import { TrustedDevice } from "@/lib/generated/prisma";

export default function SecurityPage() {
    const { data: session } = useSession();
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [showBackupCodes, setShowBackupCodes] = useState(false);
    const userId = session?.user?.id;

    const [enable2FA, { loading: enabling }] = useMutation(ENABLE_TWO_FACTOR);
    const [disable2FA, { loading: disabling }] =
        useMutation(DISABLE_TWO_FACTOR);
    const [regenerateCodes, { loading: regenerating }] = useMutation(
        REGENERATE_BACKUP_CODES
    );

    const {
        data: statusData,
        loading: loadingStatus,
        refetch: refetchStatus,
    } = useQuery(GET_TWO_FACTOR_STATUS, {
        variables: { userId },
        skip: !userId,
        fetchPolicy: "network-only",
    });

    const {
        data: backupCodesData,
        loading: loadingBackupCodes,
        refetch: refetchBackupCodes,
    } = useQuery(GET_BACKUP_CODES, {
        variables: { userId },
        skip: !userId || !showBackupCodes,
        fetchPolicy: "network-only",
    });

    const [is2FAEnabled, setIs2FAEnabled] = useState(false);

    const [devices, setDevices] = useState<TrustedDevice[]>([]);
    const [removingDevice, setRemovingDevice] = useState<string | null>(null);

    const {
        data: devicesData,
        loading: loadingDevices,
        refetch: refetchDevices,
    } = useQuery(GET_TRUSTED_DEVICES, {
        variables: { userId },
        skip: !userId,
        fetchPolicy: "network-only",
    });

    const [removeDevice] = useMutation(REMOVE_TRUSTED_DEVICE);

    useEffect(() => {
        // Update 2FA status when data is fetched
        if (statusData?.getUserTwoFactorStatus?.success) {
            setIs2FAEnabled(
                statusData.getUserTwoFactorStatus.twoFactorEnabled || false
            );
        }
    }, [statusData]);

    useEffect(() => {
        // Update backup codes when data is fetched
        if (backupCodesData?.getBackupCodes?.success) {
            setBackupCodes(backupCodesData.getBackupCodes.backupCodes || []);
        }
    }, [backupCodesData]);

    useEffect(() => {
        // Update devices when data is fetched
        if (devicesData?.getTrustedDevices?.success) {
            setDevices(devicesData.getTrustedDevices.devices || []);
        }
    }, [devicesData]);

    const handleToggle2FA = async (enabled: boolean) => {
        if (!userId) {
            toast.error("User ID not found. Please sign in again.");
            return;
        }

        try {
            if (enabled) {
                // Enable 2FA
                const { data } = await enable2FA({
                    variables: { userId },
                });

                const result = data?.enableTwoFactor;

                if (result?.success) {
                    setIs2FAEnabled(true);
                    setBackupCodes(result.backupCodes || []);
                    setShowBackupCodes(true);
                    toast.success(
                        "Two-factor authentication enabled successfully."
                    );
                    refetchStatus();
                } else {
                    toast.error(
                        result?.message ||
                            "Failed to enable two-factor authentication."
                    );
                }
            } else {
                // Disable 2FA
                const { data } = await disable2FA({
                    variables: { userId },
                });

                const result = data?.disableTwoFactor;

                if (result?.success) {
                    setIs2FAEnabled(false);
                    setBackupCodes([]);
                    toast.success(
                        "Two-factor authentication disabled successfully."
                    );
                    refetchStatus();
                } else {
                    toast.error(
                        result?.message ||
                            "Failed to disable two-factor authentication."
                    );
                }
            }
        } catch (error) {
            console.error("2FA toggle error:", error);
            toast.error("An error occurred. Please try again.");
        }
    };

    const handleViewBackupCodes = () => {
        setShowBackupCodes(true);
    };

    const handleRegenerateBackupCodes = async () => {
        if (!userId) {
            toast.error("User ID not found. Please sign in again.");
            return;
        }

        try {
            const { data } = await regenerateCodes({
                variables: { userId },
            });

            const result = data?.regenerateBackupCodes;

            if (result?.success) {
                setBackupCodes(result.backupCodes || []);
                toast.success("Backup codes regenerated successfully.");
            } else {
                toast.error(
                    result?.message || "Failed to regenerate backup codes."
                );
            }
        } catch (error) {
            console.error("Regenerate backup codes error:", error);
            toast.error("An error occurred. Please try again.");
        }
    };

    const handleRemoveDevice = async (deviceToken: string) => {
        if (!userId) {
            toast.error("User ID not found. Please sign in again.");
            return;
        }

        setRemovingDevice(deviceToken);

        try {
            const { data } = await removeDevice({
                variables: { userId, deviceToken },
            });

            const result = data?.removeTrustedDevice;

            if (result?.success) {
                toast.success("Device removed successfully.");
                refetchDevices();
            } else {
                toast.error(result?.message || "Failed to remove device.");
            }
        } catch (error) {
            console.error("Remove device error:", error);
            toast.error("An error occurred. Please try again.");
        } finally {
            setRemovingDevice(null);
        }
    };

    const formatDate = (dateString: string | Date) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
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

            <div className="grid gap-8">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Shield className="h-6 w-6 text-primary" />
                            <CardTitle>Two-Factor Authentication</CardTitle>
                        </div>
                        <CardDescription>
                            Add an extra layer of security to your account by
                            requiring a verification code.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between py-4">
                            <div className="flex flex-col gap-1">
                                <Label
                                    htmlFor="two-factor"
                                    className="font-medium"
                                >
                                    Email Authentication
                                </Label>
                                <span className="text-sm text-muted-foreground">
                                    Receive a one-time code via email when
                                    signing in.
                                </span>
                            </div>
                            <Switch
                                id="two-factor"
                                checked={is2FAEnabled}
                                onCheckedChange={handleToggle2FA}
                                disabled={
                                    enabling || disabling || loadingStatus
                                }
                            />
                        </div>

                        {is2FAEnabled && (
                            <Alert className="mt-4 bg-primary/10 border-primary">
                                <CheckCircle className="h-4 w-4 text-primary" />
                                <AlertTitle>
                                    Two-factor authentication is enabled
                                </AlertTitle>
                                <AlertDescription>
                                    Your account is protected with an additional
                                    layer of security.
                                </AlertDescription>
                            </Alert>
                        )}

                        {!is2FAEnabled && (
                            <Alert className="mt-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>
                                    Two-factor authentication is disabled
                                </AlertTitle>
                                <AlertDescription>
                                    Enable two-factor authentication to better
                                    protect your account.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                    {is2FAEnabled && (
                        <CardFooter>
                            <Button
                                variant="outline"
                                onClick={handleViewBackupCodes}
                                className="w-full sm:w-auto"
                            >
                                <LockKeyhole className="mr-2 h-4 w-4" />
                                View Backup Codes
                            </Button>
                        </CardFooter>
                    )}
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Password</CardTitle>
                        <CardDescription>
                            Manage your password and account security.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between py-2">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">
                                    Change Password
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Update your password regularly for better
                                    security.
                                </p>
                            </div>
                            <Link href="/profile?tab=password">
                                <Button variant="outline">Change</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {is2FAEnabled && (
                <Card className="mt-8">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <LockKeyhole className="h-6 w-6 text-primary" />
                            <CardTitle>Trusted Devices</CardTitle>
                        </div>
                        <CardDescription>
                            Devices that can bypass two-factor authentication.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingDevices ? (
                            <div className="flex justify-center py-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : devices.length > 0 ? (
                            <div className="space-y-4">
                                {devices.map((device) => (
                                    <div
                                        key={device.id}
                                        className="flex items-center justify-between p-4 border rounded-md"
                                    >
                                        <div className="space-y-1">
                                            <div className="font-medium">
                                                {device.deviceName}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Last used:{" "}
                                                {formatDate(device.lastUsed)}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Expires:{" "}
                                                {formatDate(device.expiresAt)}
                                            </div>
                                        </div>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() =>
                                                handleRemoveDevice(
                                                    device.deviceToken
                                                )
                                            }
                                            disabled={
                                                removingDevice ===
                                                device.deviceToken
                                            }
                                        >
                                            {removingDevice ===
                                            device.deviceToken
                                                ? "Removing..."
                                                : "Remove"}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>No trusted devices</AlertTitle>
                                <AlertDescription>
                                    You have no trusted devices. When you log
                                    in, check `&ldquo;Trust this device&rdquo;`
                                    to add one.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Backup Codes Dialog */}
            <Dialog
                open={showBackupCodes}
                onOpenChange={(open) => {
                    setShowBackupCodes(open);
                    if (open) {
                        refetchBackupCodes();
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Backup Codes</DialogTitle>
                        <DialogDescription>
                            Save these backup codes in a safe place. Each code
                            can only be used once.
                        </DialogDescription>
                    </DialogHeader>

                    {loadingBackupCodes ? (
                        <div className="flex justify-center items-center h-72">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <ScrollArea className="h-72 rounded-md border p-4">
                            <div className="space-y-2">
                                {backupCodes.length > 0 ? (
                                    backupCodes.map((code, index) => (
                                        <div
                                            key={index}
                                            className="font-mono text-sm p-2 bg-muted rounded-md flex justify-between items-center"
                                        >
                                            {code}
                                            <span className="text-xs text-muted-foreground">
                                                {index + 1} of{" "}
                                                {backupCodes.length}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">
                                        No backup codes available. Click
                                        `&ldquo;Regenerate Codes&rdquo;` to
                                        create new backup codes.
                                    </p>
                                )}
                            </div>
                        </ScrollArea>
                    )}

                    <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
                        <div className="flex flex-col sm:flex-row gap-2">
                            {backupCodes.length > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        const text = backupCodes.join("\n");
                                        navigator.clipboard.writeText(text);
                                        toast.success(
                                            "Backup codes copied to clipboard"
                                        );
                                    }}
                                    disabled={regenerating}
                                >
                                    Copy Codes
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                onClick={handleRegenerateBackupCodes}
                                disabled={regenerating}
                            >
                                <RefreshCw
                                    className={`mr-2 h-4 w-4 ${
                                        regenerating ? "animate-spin" : ""
                                    }`}
                                />
                                {regenerating
                                    ? "Regenerating..."
                                    : "Regenerate Codes"}
                            </Button>
                        </div>

                        <Button onClick={() => setShowBackupCodes(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
