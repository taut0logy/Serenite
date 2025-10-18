"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { editComment } from "@/actions/community.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";

type CommentEditFormProps = {
    comment: {
        id: string;
        content: string;
        isAnonymous: boolean;
    };
    onCancel: () => void;
    onSuccess: () => void;
};

export default function CommentEditForm({
    comment,
    onCancel,
    onSuccess,
}: CommentEditFormProps) {
    const [content, setContent] = useState(comment.content);
    const [isAnonymous, setIsAnonymous] = useState(comment.isAnonymous);
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
            const result = await editComment({
                commentId: comment.id,
                content,
                isAnonymous,
            });

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Comment updated successfully");
                onSuccess();
                router.refresh();
            }
        } catch (error) {
            console.error("Error updating comment:", error);
            toast.error("Failed to update comment");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="p-4 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Textarea
                    placeholder="Edit your comment..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[100px] resize-none focus:border-primary"
                    autoFocus
                />
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="edit-comment-anonymous"
                            checked={isAnonymous}
                            onCheckedChange={setIsAnonymous}
                            className="data-[state=checked]:bg-primary"
                        />
                        <Label htmlFor="edit-comment-anonymous">
                            Comment anonymously
                        </Label>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={loading}
                            className="rounded-full"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="rounded-full"
                        >
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </div>
            </form>
        </Card>
    );
}
