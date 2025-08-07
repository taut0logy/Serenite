"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { addComment } from "@/actions/community";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type CommentFormProps = {
    postId: string;
};

export default function CommentForm({ postId }: CommentFormProps) {
    const [content, setContent] = useState("");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!content.trim()) {
            toast.error("Comment cannot be empty");
            setLoading(false);
            return;
        }

        try {
            const result = await addComment({
                postId,
                content,
                isAnonymous,
            });

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Comment added successfully");
                setContent("");
                router.refresh();
            }
        } catch (error) {
            toast.error("Failed to add comment");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
                placeholder="Share your thoughts or support..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] resize-none focus-visible:ring-primary"
            />
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center space-x-2">
                    <Switch
                        id="comment-anonymous"
                        checked={isAnonymous}
                        onCheckedChange={setIsAnonymous}
                        className="data-[state=checked]:bg-primary"
                    />
                    <Label htmlFor="comment-anonymous">
                        Comment anonymously
                    </Label>
                </div>
                <Button
                    type="submit"
                    disabled={loading}
                    className="rounded-full"
                >
                    {loading ? "Posting..." : "Post Comment"}
                </Button>
            </div>
        </form>
    );
}
