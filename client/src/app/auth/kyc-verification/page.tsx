"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Upload,
    Camera,
    FileText,
    CheckCircle,
    XCircle,
    AlertCircle,
    Info,
    Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
    kycService,
    type KYCVerificationResult,
    type KYCUploadResponse,
} from "@/actions/kyc.actions";
import { updateKycStatus } from "@/actions/kyc.server.actions";
import { useAuth } from "@/providers/auth-provider";
import { useRefreshSession } from "@/lib/session-utils";

const kycSchema = z.object({
    selfie: z
        .any()
        .refine((files) => files?.length === 1, "Selfie image is required"),
    idCard: z
        .any()
        .refine((files) => files?.length === 1, "ID card image is required"),
});

type KYCFormValues = z.infer<typeof kycSchema>;

interface VerificationStep {
    id: number;
    title: string;
    description: string;
    completed: boolean;
}

export default function KYCVerificationPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { refreshSession } = useRefreshSession();
    const [isLoading, setIsLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [verificationResult, setVerificationResult] =
        useState<KYCVerificationResult | null>(null);
    const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
    const [idCardPreview, setIdCardPreview] = useState<string | null>(null);

    const selfieInputRef = useRef<HTMLInputElement>(null);
    const idCardInputRef = useRef<HTMLInputElement>(null);

    const steps: VerificationStep[] = [
        {
            id: 1,
            title: "Upload Documents",
            description: "Upload your selfie and government-issued ID",
            completed: currentStep > 1,
        },
        {
            id: 2,
            title: "Verification",
            description: "AI-powered identity verification in progress",
            completed: currentStep > 2,
        },
        {
            id: 3,
            title: "Results",
            description: "Review your verification results",
            completed: currentStep === 3 && verificationResult !== null,
        },
    ];

    const form = useForm<KYCFormValues>({
        resolver: zodResolver(kycSchema),
    });

    const handleFilePreview = (file: File, type: "selfie" | "idCard") => {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (type === "selfie") {
                setSelfiePreview(e.target?.result as string);
            } else {
                setIdCardPreview(e.target?.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleFileChange = (
        event: React.ChangeEvent<HTMLInputElement>,
        type: "selfie" | "idCard"
    ) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            const file = files[0];

            // Validate file
            const validation = kycService.validateImageFile(file);
            if (!validation.valid) {
                toast.error(validation.error);
                return;
            }

            // Update form
            form.setValue(type, files);

            // Show preview
            handleFilePreview(file, type);
        }
    };

    async function onSubmit(data: KYCFormValues) {
        setIsLoading(true);
        setCurrentStep(2);

        try {
            const selfieFile = data.selfie[0] as File;
            const idCardFile = data.idCard[0] as File;

            toast.loading("Processing your verification...", {
                id: "kyc-upload",
            });

            const response: KYCUploadResponse = await kycService.uploadImages(
                selfieFile,
                idCardFile,
                user?.id
            );

            toast.dismiss("kyc-upload");

            if (response.status === "success") {
                setVerificationResult(response.verification_result);
                setCurrentStep(3);

                if (response.verification_result.verified) {
                    // Update KYC status in the database using server action
                    try {
                        const kycUpdateResult = await updateKycStatus(
                            user?.id || "",
                            true
                        );

                        if (kycUpdateResult.success) {
                            // Update the session to reflect the new KYC status
                            await refreshSession();

                            toast.success("Identity verification successful!");

                            // Redirect to dashboard with updated session
                            router.push("/dashboard");
                        } else {
                            toast.error(
                                kycUpdateResult.message ||
                                    "Failed to update verification status. Please contact support."
                            );
                        }
                    } catch (updateError) {
                        console.error("KYC status update error:", updateError);
                        toast.error(
                            "Verification successful but status update failed. Please contact support."
                        );
                    }
                } else {
                    toast.warning(
                        "Identity verification failed. Please try again with clearer images."
                    );
                }
            } else {
                toast.error("Verification failed. Please try again.");
            }
        } catch (error) {
            console.error("KYC verification error:", error);
            toast.dismiss("kyc-upload");

            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("Verification failed. Please try again.");
            }

            setCurrentStep(1);
        } finally {
            setIsLoading(false);
        }
    }

    const resetVerification = () => {
        setCurrentStep(1);
        setVerificationResult(null);
        setSelfiePreview(null);
        setIdCardPreview(null);
        form.reset();
        if (selfieInputRef.current) selfieInputRef.current.value = "";
        if (idCardInputRef.current) idCardInputRef.current.value = "";
    };

    const getConfidenceColor = (score: number) => {
        if (score >= 90) return "text-green-600";
        if (score >= 75) return "text-yellow-600";
        return "text-red-600";
    };

    return (
        <div className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-2xl space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold">
                        Identity Verification
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Complete your KYC verification to secure your account
                    </p>
                </div>

                {/* Progress Steps */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Verification Progress
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <Progress
                                value={(currentStep / 3) * 100}
                                className="w-full"
                            />
                            <div className="grid grid-cols-3 gap-4">
                                {steps.map((step) => (
                                    <div
                                        key={step.id}
                                        className={`text-center p-3 rounded-lg border ${
                                            step.completed
                                                ? "bg-green-50 border-green-200"
                                                : currentStep === step.id
                                                ? "bg-blue-50 border-blue-200"
                                                : "bg-gray-50 border-gray-200"
                                        }`}
                                    >
                                        <div className="flex justify-center mb-2">
                                            {step.completed ? (
                                                <CheckCircle className="h-6 w-6 text-green-600" />
                                            ) : currentStep === step.id ? (
                                                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                                            ) : (
                                                <AlertCircle className="h-6 w-6 text-gray-400" />
                                            )}
                                        </div>
                                        <h3 className="font-medium text-sm">
                                            {step.title}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {step.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Step 1: Document Upload */}
                {currentStep === 1 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Upload className="h-5 w-5" />
                                Upload Documents
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Alert className="mb-6">
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                    Please ensure your images are clear,
                                    well-lit, and your face is fully visible.
                                    Accepted formats: JPG, PNG, WebP (max 10MB
                                    each).
                                </AlertDescription>
                            </Alert>

                            <Form {...form}>
                                <form
                                    onSubmit={form.handleSubmit(onSubmit)}
                                    className="space-y-6"
                                >
                                    {/* Selfie Upload */}
                                    <FormField
                                        control={form.control}
                                        name="selfie"
                                        render={() => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2">
                                                    <Camera className="h-4 w-4" />
                                                    Selfie Photo
                                                </FormLabel>
                                                <FormDescription>
                                                    Take a clear selfie with
                                                    good lighting
                                                </FormDescription>
                                                <FormControl>
                                                    <div className="space-y-4">
                                                        <Input
                                                            ref={selfieInputRef}
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) =>
                                                                handleFileChange(
                                                                    e,
                                                                    "selfie"
                                                                )
                                                            }
                                                            disabled={isLoading}
                                                            className="cursor-pointer"
                                                        />
                                                        {selfiePreview && (
                                                            <div className="relative w-full max-w-xs mx-auto">
                                                                <Image
                                                                    src={
                                                                        selfiePreview
                                                                    }
                                                                    alt="Selfie preview"
                                                                    width={300}
                                                                    height={200}
                                                                    className="w-full h-48 object-cover rounded-lg border"
                                                                />
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="absolute top-2 right-2"
                                                                >
                                                                    Selfie
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* ID Card Upload */}
                                    <FormField
                                        control={form.control}
                                        name="idCard"
                                        render={() => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4" />
                                                    Government-Issued ID
                                                </FormLabel>
                                                <FormDescription>
                                                    Upload a clear photo of your
                                                    passport, driver&apos;s
                                                    license, or national ID
                                                </FormDescription>
                                                <FormControl>
                                                    <div className="space-y-4">
                                                        <Input
                                                            ref={idCardInputRef}
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) =>
                                                                handleFileChange(
                                                                    e,
                                                                    "idCard"
                                                                )
                                                            }
                                                            disabled={isLoading}
                                                            className="cursor-pointer"
                                                        />
                                                        {idCardPreview && (
                                                            <div className="relative w-full max-w-xs mx-auto">
                                                                <Image
                                                                    src={
                                                                        idCardPreview
                                                                    }
                                                                    alt="ID card preview"
                                                                    width={300}
                                                                    height={200}
                                                                    className="w-full h-48 object-cover rounded-lg border"
                                                                />
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="absolute top-2 right-2"
                                                                >
                                                                    ID Card
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={
                                            isLoading ||
                                            !selfiePreview ||
                                            !idCardPreview
                                        }
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            "Start Verification"
                                        )}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Processing */}
                {currentStep === 2 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Verifying Your Identity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                                </div>
                                <div>
                                    <h3 className="font-medium">
                                        Processing your documents...
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Our AI is analyzing your images and
                                        comparing faces. This may take a few
                                        moments.
                                    </p>
                                </div>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>✓ Images uploaded successfully</p>
                                    <p>✓ Face detection in progress</p>
                                    <p>⏳ Verifying identity match</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: Results */}
                {currentStep === 3 && verificationResult && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {verificationResult.verified ? (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                    <XCircle className="h-5 w-5 text-red-600" />
                                )}
                                Verification Results
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {/* Overall Result */}
                                <Alert
                                    className={
                                        verificationResult.verified
                                            ? "border-green-200 bg-green-50"
                                            : "border-red-200 bg-red-50"
                                    }
                                >
                                    <AlertDescription className="font-medium">
                                        {verificationResult.message}
                                    </AlertDescription>
                                </Alert>

                                {/* Detailed Metrics */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-lg border bg-gray-50">
                                        <h4 className="font-medium text-sm mb-2">
                                            Confidence Score
                                        </h4>
                                        <div
                                            className={`text-2xl font-bold ${getConfidenceColor(
                                                verificationResult.confidence_score
                                            )}`}
                                        >
                                            {kycService.formatConfidenceScore(
                                                verificationResult.confidence_score
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-lg border bg-gray-50">
                                        <h4 className="font-medium text-sm mb-2">
                                            Models Agreement
                                        </h4>
                                        <div className="text-2xl font-bold">
                                            {verificationResult.models_agreed}/
                                            {verificationResult.total_models}
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-lg border bg-gray-50">
                                        <h4 className="font-medium text-sm mb-2">
                                            Selfie Quality
                                        </h4>
                                        <div className="text-2xl font-bold">
                                            {verificationResult.selfie_quality.toFixed(
                                                1
                                            )}
                                            /100
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-lg border bg-gray-50">
                                        <h4 className="font-medium text-sm mb-2">
                                            ID Photo Quality
                                        </h4>
                                        <div className="text-2xl font-bold">
                                            {verificationResult.id_photo_quality.toFixed(
                                                1
                                            )}
                                            /100
                                        </div>
                                    </div>
                                </div>

                                {/* Individual Model Results */}
                                <div>
                                    <h4 className="font-medium mb-3">
                                        Individual Model Results
                                    </h4>
                                    <div className="space-y-2">
                                        {verificationResult.individual_results.map(
                                            (result, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between p-3 rounded-lg border"
                                                >
                                                    <span className="font-medium">
                                                        {result.model}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <Badge
                                                            variant={
                                                                result.verified
                                                                    ? "default"
                                                                    : "destructive"
                                                            }
                                                        >
                                                            {result.verified
                                                                ? "Verified"
                                                                : "Failed"}
                                                        </Badge>
                                                        <span className="text-sm text-muted-foreground">
                                                            {(
                                                                result.distance *
                                                                100
                                                            ).toFixed(1)}
                                                            %
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-4">
                                    {verificationResult.verified ? (
                                        <Button
                                            onClick={() =>
                                                router.push("/dashboard")
                                            }
                                            className="flex-1"
                                        >
                                            Continue to Dashboard
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={resetVerification}
                                            variant="outline"
                                            className="flex-1"
                                        >
                                            Try Again
                                        </Button>
                                    )}
                                    <Button
                                        onClick={() =>
                                            router.push("/auth/login")
                                        }
                                        variant="outline"
                                    >
                                        Back to Login
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="text-center text-sm text-muted-foreground">
                    <p>
                        Need help?{" "}
                        <Link
                            href="/support"
                            className="text-primary hover:underline"
                        >
                            Contact Support
                        </Link>
                    </p>
                    <p className="mt-2">
                        By proceeding, you agree to our{" "}
                        <Link
                            href="/privacy"
                            className="text-primary hover:underline"
                        >
                            Privacy Policy
                        </Link>{" "}
                        and{" "}
                        <Link
                            href="/terms"
                            className="text-primary hover:underline"
                        >
                            Terms of Service
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
