"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Eye, EyeOff, Shield, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface PasswordPromptProps {
    onPasswordSubmit: (password: string) => void;
    isLoading?: boolean;
    error?: string | null;
}

export function QuestionnairePasswordPrompt({
    onPasswordSubmit,
    isLoading = false,
    error = null,
}: PasswordPromptProps) {
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password.trim()) {
            onPasswordSubmit(password);
        }
    };

    return (
        <div className="max-w-md mx-auto p-6 min-h-[calc(100vh-65px)] flex flex-col justify-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Card className="shadow-xl border-2 border-border/50">
                    <CardHeader className="text-center pb-4">
                        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <Shield className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-bold">
                            Secure Your Responses
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <p className="text-sm text-muted-foreground text-center">
                            Your questionnaire responses are encrypted with your password.
                            Only you can access them.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Lock className="w-4 h-4" />
                                    Enter Your Password
                                </label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Your account password"
                                        className="pr-10"
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={!password.trim() || isLoading}
                            >
                                {isLoading ? "Verifying..." : "Continue"}
                            </Button>
                        </form>

                        <div className="text-xs text-muted-foreground text-center p-3 bg-muted/30 rounded-lg">
                            <Lock className="w-3 h-3 inline-block mr-1" />
                            Your responses are encrypted end-to-end. We cannot access them.
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
