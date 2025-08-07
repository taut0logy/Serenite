"use client";

import { ReactNode } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface MeetingModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    className?: string;
    children?: ReactNode;
    handleClick?: () => void;
    buttonText?: string;
    image?: string;
    buttonClassName?: string;
    buttonIcon?: string;
}

const MeetingModal = ({
    isOpen,
    onClose,
    title,
    className,
    children,
    handleClick,
    buttonText,
    image,
    buttonClassName,
    buttonIcon,
}: MeetingModalProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[520px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <DialogHeader>
                    {image && (
                        <div className="flex justify-center mb-4">
                            <Image
                                src={image}
                                alt="modal icon"
                                width={72}
                                height={72}
                            />
                        </div>
                    )}
                    <DialogTitle
                        className={cn(
                            "text-center text-2xl font-semibold",
                            className
                        )}
                    >
                        {title}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {children}

                    {handleClick && (
                        <Button
                            className={cn(
                                "w-full bg-blue-600 hover:bg-blue-700 text-white",
                                buttonClassName
                            )}
                            onClick={handleClick}
                        >
                            {buttonIcon && (
                                <Image
                                    src={buttonIcon}
                                    alt="button icon"
                                    width={16}
                                    height={16}
                                    className="mr-2"
                                />
                            )}
                            {buttonText || "Schedule Meeting"}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default MeetingModal;
