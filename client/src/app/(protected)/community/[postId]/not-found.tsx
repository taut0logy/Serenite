import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
    return (
        <div className="flex justify-center w-full">
            <div className="container max-w-3xl py-20 px-4 sm:px-6 text-center">
                <div className="flex justify-center mb-6">
                    <AlertTriangle className="h-12 w-12 text-amber-500" />
                </div>
                <h2 className="text-3xl font-bold mb-4">Post Not Found</h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    The post you are looking for does not exist or has been
                    removed.
                </p>
                <Button asChild>
                    <Link href="/community">Back to Community</Link>
                </Button>
            </div>
        </div>
    );
}
