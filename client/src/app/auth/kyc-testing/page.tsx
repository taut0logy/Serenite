"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useMutation } from "@apollo/client";
import {
    Shield,
    Eye,
    EyeOff,
    RefreshCw,
    Database,
    Server,
    User,
    Check,
    X,
    AlertTriangle,
    Settings,
    Code,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useKYC } from "@/hooks/use-kyc";
import { kycService } from "@/actions/kyc.actions";
import { UPDATE_KYC_STATUS } from "@/graphql/operations";

export default function KYCTestingPage() {
    const { data: session, update } = useSession();
    const [updateKycStatus] = useMutation(UPDATE_KYC_STATUS);
    const {
        kycStatus,
        verificationResult,
        isLoading,
        getKYCStatus,
        clearKYCData,
        reset: resetKYC,
    } = useKYC();

    const [showSensitiveData, setShowSensitiveData] = useState(false);
    const [serviceHealth, setServiceHealth] = useState<{
        service: string;
        upload_directory: string;
        face_detection: string;
        message: string;
    } | null>(null);
    const [isServiceHealthy, setIsServiceHealthy] = useState<boolean | null>(
        null
    );

    useEffect(() => {
        if (session?.user?.id) {
            getKYCStatus();
            handleHealthCheck();
        }
    }, [session?.user?.id, getKYCStatus]);

    const handleHealthCheck = async () => {
        try {
            const health = await kycService.checkHealth();
            setServiceHealth(health);
            setIsServiceHealthy(true);
        } catch (error) {
            setIsServiceHealthy(false);
            console.error("Health check failed:", error);
        }
    };

    const handleToggleKYCStatus = async (verified: boolean) => {
        if (!session?.user?.id) return;

        try {
            const { data } = await updateKycStatus({
                variables: {
                    userId: session.user.id,
                    kycVerified: verified,
                },
            });

            if (data?.updateKycStatus?.success) {
                await update({
                    ...session,
                    user: {
                        ...session.user,
                        kycVerified: verified,
                    },
                });

                toast.success(
                    `KYC status ${verified ? "enabled" : "disabled"}`
                );
                getKYCStatus();
            } else {
                toast.error("Failed to update KYC status");
            }
        } catch (error) {
            console.error("KYC status update error:", error);
            toast.error("Failed to update KYC status");
        }
    };

    const handleClearData = async () => {
        try {
            await clearKYCData();
            await handleToggleKYCStatus(false);
            resetKYC();
            toast.success("KYC data cleared successfully");
        } catch {
            toast.error("Failed to clear KYC data");
        }
    };

    if (!session) {
        return (
            <div className="container mx-auto py-8">
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        Please log in to access the KYC testing interface.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold flex items-center justify-center gap-2">
                    <Shield className="h-8 w-8" />
                    KYC Testing Interface
                </h1>
                <p className="text-muted-foreground">
                    Internal testing and debugging interface for KYC
                    verification system
                </p>
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>⚠️ Development Tool:</strong> This page contains
                        sensitive information and should not be accessible in
                        production.
                    </AlertDescription>
                </Alert>
            </div>

            {/* Service Health */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        Service Health
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span>KYC Service Status</span>
                            <div className="flex items-center gap-2">
                                <Badge
                                    variant={
                                        isServiceHealthy
                                            ? "default"
                                            : "destructive"
                                    }
                                >
                                    {isServiceHealthy ? "Healthy" : "Unhealthy"}
                                </Badge>
                                <Button
                                    onClick={handleHealthCheck}
                                    variant="outline"
                                    size="sm"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {serviceHealth && (
                            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="font-medium">
                                            Service:
                                        </span>{" "}
                                        {serviceHealth.service}
                                    </div>
                                    <div>
                                        <span className="font-medium">
                                            Upload Directory:
                                        </span>{" "}
                                        {serviceHealth.upload_directory}
                                    </div>
                                    <div>
                                        <span className="font-medium">
                                            Face Detection:
                                        </span>{" "}
                                        {serviceHealth.face_detection}
                                    </div>
                                    <div>
                                        <span className="font-medium">
                                            Message:
                                        </span>{" "}
                                        {serviceHealth.message}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* User Session Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        User Session Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="font-medium">User ID:</span>
                                <div className="font-mono text-sm bg-gray-100 p-2 rounded">
                                    {session.user?.id || "N/A"}
                                </div>
                            </div>
                            <div>
                                <span className="font-medium">Email:</span>
                                <div className="font-mono text-sm bg-gray-100 p-2 rounded">
                                    {session.user?.email || "N/A"}
                                </div>
                            </div>
                            <div>
                                <span className="font-medium">
                                    Email Verified:
                                </span>
                                <Badge
                                    variant={
                                        session.user?.email_verified
                                            ? "default"
                                            : "destructive"
                                    }
                                >
                                    {session.user?.email_verified
                                        ? "Yes"
                                        : "No"}
                                </Badge>
                            </div>
                            <div>
                                <span className="font-medium">
                                    KYC Verified:
                                </span>
                                <Badge
                                    variant={
                                        session.user?.kycVerified
                                            ? "default"
                                            : "destructive"
                                    }
                                >
                                    {session.user?.kycVerified ? "Yes" : "No"}
                                </Badge>
                            </div>
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <span className="font-medium">
                                Toggle KYC Status (Testing)
                            </span>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm">Disabled</span>
                                    <Switch
                                        checked={
                                            session.user?.kycVerified || false
                                        }
                                        onCheckedChange={handleToggleKYCStatus}
                                    />
                                    <span className="text-sm">Enabled</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KYC Status Details */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        KYC Status Details
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-4">
                            Loading KYC status...
                        </div>
                    ) : kycStatus ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="font-medium">Status:</span>
                                    <Badge
                                        className="ml-2"
                                        variant={
                                            kycStatus.kyc_status === "verified"
                                                ? "default"
                                                : kycStatus.kyc_status ===
                                                  "rejected"
                                                ? "destructive"
                                                : "secondary"
                                        }
                                    >
                                        {kycService.getStatusText(
                                            kycStatus.kyc_status
                                        )}
                                    </Badge>
                                </div>
                                <div>
                                    <span className="font-medium">
                                        Verification Attempts:
                                    </span>
                                    <span className="ml-2">
                                        {kycStatus.verification_attempts}
                                    </span>
                                </div>
                                <div>
                                    <span className="font-medium">
                                        Identity Verified:
                                    </span>
                                    {kycStatus.identity_verified ? (
                                        <Check className="inline ml-2 h-4 w-4 text-green-600" />
                                    ) : (
                                        <X className="inline ml-2 h-4 w-4 text-red-600" />
                                    )}
                                </div>
                                <div>
                                    <span className="font-medium">
                                        Liveness Verified:
                                    </span>
                                    {kycStatus.liveness_verified ? (
                                        <Check className="inline ml-2 h-4 w-4 text-green-600" />
                                    ) : (
                                        <X className="inline ml-2 h-4 w-4 text-red-600" />
                                    )}
                                </div>
                            </div>

                            {kycStatus.last_verification_date && (
                                <div>
                                    <span className="font-medium">
                                        Last Verification:
                                    </span>
                                    <div className="font-mono text-sm bg-gray-100 p-2 rounded mt-1">
                                        {new Date(
                                            kycStatus.last_verification_date
                                        ).toLocaleString()}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-muted-foreground">
                            No KYC status found
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Verification Results */}
            {verificationResult && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Code className="h-5 w-5" />
                            Last Verification Results
                            <Button
                                onClick={() =>
                                    setShowSensitiveData(!showSensitiveData)
                                }
                                variant="outline"
                                size="sm"
                                className="ml-auto"
                            >
                                {showSensitiveData ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                                {showSensitiveData ? "Hide" : "Show"} Details
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="font-medium">
                                        Verified:
                                    </span>
                                    <Badge
                                        className="ml-2"
                                        variant={
                                            verificationResult.verified
                                                ? "default"
                                                : "destructive"
                                        }
                                    >
                                        {verificationResult.verified
                                            ? "Yes"
                                            : "No"}
                                    </Badge>
                                </div>
                                <div>
                                    <span className="font-medium">
                                        Confidence Score:
                                    </span>
                                    <span className="ml-2 font-mono">
                                        {verificationResult.confidence_score.toFixed(
                                            2
                                        )}
                                        %
                                    </span>
                                </div>
                                <div>
                                    <span className="font-medium">
                                        Selfie Quality:
                                    </span>
                                    <span className="ml-2 font-mono">
                                        {verificationResult.selfie_quality.toFixed(
                                            2
                                        )}
                                        /100
                                    </span>
                                </div>
                                <div>
                                    <span className="font-medium">
                                        ID Photo Quality:
                                    </span>
                                    <span className="ml-2 font-mono">
                                        {verificationResult.id_photo_quality.toFixed(
                                            2
                                        )}
                                        /100
                                    </span>
                                </div>
                            </div>

                            {showSensitiveData && (
                                <div className="space-y-4">
                                    <Separator />
                                    <div>
                                        <span className="font-medium">
                                            Model Results:
                                        </span>
                                        <div className="mt-2 space-y-2">
                                            {verificationResult.individual_results.map(
                                                (result, index) => (
                                                    <div
                                                        key={index}
                                                        className="bg-gray-50 p-3 rounded"
                                                    >
                                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                                            <div>
                                                                <strong>
                                                                    Model:
                                                                </strong>{" "}
                                                                {result.model}
                                                            </div>
                                                            <div>
                                                                <strong>
                                                                    Verified:
                                                                </strong>{" "}
                                                                <Badge
                                                                    variant={
                                                                        result.verified
                                                                            ? "default"
                                                                            : "destructive"
                                                                    }
                                                                >
                                                                    {result.verified
                                                                        ? "Yes"
                                                                        : "No"}
                                                                </Badge>
                                                            </div>
                                                            <div>
                                                                <strong>
                                                                    Distance:
                                                                </strong>{" "}
                                                                {result.distance.toFixed(
                                                                    4
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <span className="font-medium">
                                            Verification Message:
                                        </span>
                                        <div className="bg-gray-100 p-3 rounded mt-1 text-sm">
                                            {verificationResult.message}
                                        </div>
                                    </div>

                                    <div>
                                        <span className="font-medium">
                                            Timestamp:
                                        </span>
                                        <div className="font-mono text-sm bg-gray-100 p-2 rounded mt-1">
                                            {verificationResult.timestamp}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Testing Actions */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Testing Actions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Button
                                onClick={getKYCStatus}
                                variant="outline"
                                className="w-full"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh Status
                            </Button>

                            <Button
                                onClick={handleClearData}
                                variant="destructive"
                                className="w-full"
                            >
                                <X className="h-4 w-4 mr-2" />
                                Clear KYC Data
                            </Button>

                            <Button
                                onClick={handleHealthCheck}
                                variant="secondary"
                                className="w-full"
                            >
                                <Server className="h-4 w-4 mr-2" />
                                Check Service Health
                            </Button>
                        </div>

                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Warning:</strong> These actions modify
                                real data. Use carefully in development
                                environment only.
                            </AlertDescription>
                        </Alert>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
