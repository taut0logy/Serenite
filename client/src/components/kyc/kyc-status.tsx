import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Shield,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
} from "lucide-react";
import { useKYC } from "@/hooks/use-kyc";
import { kycService } from "@/services/kyc.service";

interface KYCStatusComponentProps {
    userId?: string;
    showActions?: boolean;
    onVerificationClick?: () => void;
}

export function KYCStatusComponent({
    userId,
    showActions = true,
    onVerificationClick,
}: KYCStatusComponentProps) {
    const { kycStatus, isLoading, getKYCStatus } = useKYC();

    useEffect(() => {
        if (userId) {
            getKYCStatus();
        }
    }, [userId, getKYCStatus]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "verified":
                return <CheckCircle className="h-5 w-5 text-green-600" />;
            case "rejected":
                return <XCircle className="h-5 w-5 text-red-600" />;
            case "pending":
                return <Clock className="h-5 w-5 text-yellow-600" />;
            case "in_progress":
                return <Clock className="h-5 w-5 text-blue-600" />;
            case "expired":
                return <AlertTriangle className="h-5 w-5 text-gray-600" />;
            default:
                return <Shield className="h-5 w-5 text-gray-400" />;
        }
    };

    const getStatusVariant = (
        status: string
    ): "default" | "secondary" | "destructive" => {
        switch (status) {
            case "verified":
                return "default";
            case "rejected":
                return "destructive";
            default:
                return "secondary";
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        KYC Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!kycStatus) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        KYC Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-gray-400" />
                            <span className="text-sm text-muted-foreground">
                                Not Started
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Complete your identity verification to secure your
                            account.
                        </p>
                        {showActions && onVerificationClick && (
                            <Button onClick={onVerificationClick} size="sm">
                                Start Verification
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    KYC Status
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {getStatusIcon(kycStatus.kyc_status)}
                            <span className="font-medium">
                                {kycService.getStatusText(kycStatus.kyc_status)}
                            </span>
                        </div>
                        <Badge variant={getStatusVariant(kycStatus.kyc_status)}>
                            {kycService.getStatusText(kycStatus.kyc_status)}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-muted-foreground">
                                Identity:
                            </span>
                            <div className="flex items-center gap-1 mt-1">
                                {kycStatus.identity_verified ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                    <XCircle className="h-4 w-4 text-red-600" />
                                )}
                                <span>
                                    {kycStatus.identity_verified
                                        ? "Verified"
                                        : "Not Verified"}
                                </span>
                            </div>
                        </div>
                        <div>
                            <span className="text-muted-foreground">
                                Liveness:
                            </span>
                            <div className="flex items-center gap-1 mt-1">
                                {kycStatus.liveness_verified ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                    <XCircle className="h-4 w-4 text-red-600" />
                                )}
                                <span>
                                    {kycStatus.liveness_verified
                                        ? "Verified"
                                        : "Not Verified"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {kycStatus.verification_attempts > 0 && (
                        <div className="text-sm text-muted-foreground">
                            Verification attempts:{" "}
                            {kycStatus.verification_attempts}
                        </div>
                    )}

                    {kycStatus.last_verification_date && (
                        <div className="text-sm text-muted-foreground">
                            Last verified:{" "}
                            {new Date(
                                kycStatus.last_verification_date
                            ).toLocaleDateString()}
                        </div>
                    )}

                    {showActions && (
                        <div className="flex gap-2">
                            {kycStatus.kyc_status !== "verified" &&
                                onVerificationClick && (
                                    <Button
                                        onClick={onVerificationClick}
                                        size="sm"
                                        variant="outline"
                                    >
                                        {kycStatus.kyc_status === "rejected"
                                            ? "Retry Verification"
                                            : "Complete Verification"}
                                    </Button>
                                )}
                            {kycStatus.kyc_status === "verified" && (
                                <Badge variant="default" className="w-fit">
                                    ✓ Verification Complete
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
