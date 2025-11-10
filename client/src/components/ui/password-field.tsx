"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EyeIcon, EyeOffIcon } from "lucide-react";

export interface PasswordFieldProps {
    field: {
        name: string;
        value: string;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    };
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    ariaLabel?: string;
}

export default function PasswordField({ field, placeholder = "••••••••", className = "pr-10", ariaLabel = "Password", disabled = false }: PasswordFieldProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="relative">
            <Input
                type={showPassword ? "text" : "password"}
                placeholder={placeholder}
                aria-label={ariaLabel}
                className={className}
                {...field}
                disabled={disabled}
            />

            <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                    e.preventDefault();
                    setShowPassword(!showPassword);
                }}
                className="absolute right-0 top-0"
            >
                {showPassword ? <EyeIcon /> : <EyeOffIcon />}
            </Button>
        </div>
    );
}
