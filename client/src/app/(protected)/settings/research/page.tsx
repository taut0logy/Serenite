"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, FlaskConical, Info } from "lucide-react";

import {
    getCalibrationConsent,
    setCalibrationConsent,
} from "@/actions/calibration.actions";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Consent to contribute assessment answers for calibration.
 *
 * Kept off the sign-up flow and out of the assessment itself on purpose.
 * Consent bundled into either of those is not really consent: somebody working
 * through a mental health questionnaire is not in a position to weigh a
 * research request, and somebody creating an account will click past anything
 * between them and the product.
 *
 * The one thing this page has to get right is telling people what withdrawing
 * does and does not do, before they opt in rather than after.
 */
export default function ResearchSettingsPage() {
    const [consented, setConsented] = useState<boolean | null>(null);
    const [pending, startTransition] = useTransition();

    useEffect(() => {
        getCalibrationConsent().then((result) => {
            setConsented(result.success ? (result.consented ?? false) : false);
            if (!result.success) toast.error(result.error ?? "Could not load your preference");
        });
    }, []);

    function onToggle(next: boolean) {
        const previous = consented;
        setConsented(next);
        startTransition(async () => {
            const result = await setCalibrationConsent(next);
            if (!result.success) {
                // Put the switch back rather than leaving it showing a state
                // the server never accepted.
                setConsented(previous);
                toast.error(result.error ?? "Could not save your preference");
                return;
            }
            toast.success(
                next
                    ? "Thank you. Future assessments will contribute."
                    : "Stopped. Future assessments will not contribute."
            );
        });
    }

    return (
        <div className="container max-w-2xl py-10 px-4 mx-auto">
            <Link
                href="/settings"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to settings
            </Link>

            <div className="mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <FlaskConical className="h-7 w-7 text-primary" />
                    Research contribution
                </h1>
                <p className="text-muted-foreground mt-2">
                    Optional, off unless you turn it on, and never required to use anything here.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Contribute your assessment answers</CardTitle>
                    <CardDescription>
                        The assessment picks each question based on estimates of how well that
                        question separates people. Those estimates currently come from clinical
                        judgement rather than from data. Real answers are what replace them, and
                        the assessment gets shorter and more accurate for everyone as a result.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5 pr-4">
                            <Label htmlFor="calibration-consent" className="text-base">
                                Contribute my answers
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Applies to assessments you take from now on.
                            </p>
                        </div>
                        {consented === null ? (
                            <Skeleton className="h-6 w-11 rounded-full" />
                        ) : (
                            <Switch
                                id="calibration-consent"
                                checked={consented}
                                onCheckedChange={onToggle}
                                disabled={pending}
                            />
                        )}
                    </div>

                    <div className="space-y-3 text-sm">
                        <h3 className="font-medium text-foreground">What gets sent</h3>
                        <p className="text-muted-foreground">
                            Which questions you were shown, the answer you chose for each, the
                            order they came in, and how long each one took. Nothing else. Your
                            name, your account, your written notes, your diary, and your results
                            are not part of it.
                        </p>

                        <h3 className="font-medium text-foreground pt-2">
                            How it is separated from you
                        </h3>
                        <p className="text-muted-foreground">
                            Each set of answers is filed under a random identifier generated for
                            that sitting alone. It is not stored anywhere against your account,
                            and a new one is made every time, so two assessments by you cannot be
                            recognised as the same person. The only thing recorded on your account
                            is this switch.
                        </p>
                    </div>

                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Turning this off later stops new contributions only</AlertTitle>
                        <AlertDescription>
                            Answers already contributed cannot be taken back. They carry no link
                            to your account, so there is nothing to look up and delete. That is
                            the same property that keeps them anonymous, and we would rather say
                            so now than imply this is reversible when it is not.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        </div>
    );
}
