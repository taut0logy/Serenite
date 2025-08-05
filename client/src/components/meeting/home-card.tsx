"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface HomeCardProps {
    className?: string;
    img: string;
    title: string;
    description: string;
    handleClick?: () => void;
}

const HomeCard = ({
    className,
    img,
    title,
    description,
    handleClick,
}: HomeCardProps) => {
    return (
        <Card
            className={cn(
                "bg-gradient-to-br from-blue-500 to-blue-600 px-6 py-8 flex flex-col justify-between w-full min-h-[260px] rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 text-white border-none",
                className
            )}
            onClick={handleClick}
        >
            <CardContent className="p-0 space-y-4">
                <div className="flex items-center justify-center size-12 rounded-lg bg-white/20 backdrop-blur-sm">
                    <Image src={img} alt="meeting" width={24} height={24} />
                </div>

                <div className="space-y-2">
                    <h3 className="text-xl font-semibold">{title}</h3>
                    <p className="text-blue-100 text-sm">{description}</p>
                </div>
            </CardContent>
        </Card>
    );
};

export default HomeCard;
