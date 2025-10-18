"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { editPost } from "@/actions/community.actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ReactionType } from "@prisma/client";

type EditPostDialogProps = {
    post: {
        id: string;
        title: string;
        content: string;
        isAnonymous: boolean;
        tags: string[];
        reactionCounts: Record<ReactionType, number>;
    };
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function EditPostDialog({
    post,
    open,
    onOpenChange,
}: EditPostDialogProps) {
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState(post.title);
    const [content, setContent] = useState(post.content);
    const [isAnonymous, setIsAnonymous] = useState(post.isAnonymous);
    const [selectedTags, setSelectedTags] = useState<string[]>(post.tags);
    const router = useRouter();

    // Reset form state when post changes
    useEffect(() => {
        if (open) {
            setTitle(post.title);
            setContent(post.content);
            setIsAnonymous(post.isAnonymous);
            setSelectedTags(post.tags);
        }
    }, [post, open]);

    const availableTags = [
        "Mental Health",
        "Anxiety",
        "Depression",
        "Stress",
        "Self Care",
        "Therapy",
        "Relationships",
        "Work",
        "Family",
    ];

    const handleTagToggle = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags((prev) => prev.filter((t) => t !== tag));
        } else {
            setSelectedTags((prev) => [...prev, tag]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await editPost({
                postId: post.id,
                title,
                content,
                isAnonymous,
                tags: selectedTags,
            });

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Post updated successfully");
                onOpenChange(false);
                router.refresh();
            }
        } catch (error) {
            console.error("Error updating post:", error);
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Edit your post</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="edit-title">Title</Label>
                        <Input
                            id="edit-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter the title of your post"
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-content">Content</Label>
                        <Textarea
                            id="edit-content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Share your thoughts, feelings, or questions..."
                            className="min-h-[120px]"
                            required
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="edit-anonymous"
                            checked={isAnonymous}
                            onCheckedChange={setIsAnonymous}
                        />
                        <Label htmlFor="edit-anonymous">Post anonymously</Label>
                    </div>
                    <div className="grid gap-2">
                        <Label>Tags</Label>
                        <div className="flex flex-wrap gap-2">
                            {availableTags.map((tag) => (
                                <Button
                                    key={tag}
                                    type="button"
                                    variant={
                                        selectedTags.includes(tag)
                                            ? "default"
                                            : "outline"
                                    }
                                    size="sm"
                                    onClick={() => handleTagToggle(tag)}
                                >
                                    {tag}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Updating..." : "Update Post"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
