"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { createPost } from "@/actions/community";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function CreatePostButton() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const router = useRouter();

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
            const result = await createPost({
                title,
                content,
                isAnonymous,
                tags: selectedTags,
            });

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Post created successfully");
                setOpen(false);
                setTitle("");
                setContent("");
                setIsAnonymous(false);
                setSelectedTags([]);
                router.refresh();
            }
        } catch (error) {
            console.error("Error creating post:", error);
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="rounded-full gap-1.5">
                    <Plus className="h-4 w-4" />
                    Create Post
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="text-center text-xl">
                        Share your thoughts
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter the title of your post"
                            className="focus-visible:ring-primary"
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="content">Content</Label>
                        <Textarea
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Share your thoughts, feelings, or questions..."
                            className="min-h-[150px] resize-none focus-visible:ring-primary"
                            required
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="anonymous"
                            checked={isAnonymous}
                            onCheckedChange={setIsAnonymous}
                            className="data-[state=checked]:bg-primary"
                        />
                        <Label htmlFor="anonymous">Post anonymously</Label>
                    </div>
                    <div className="grid gap-2">
                        <Label>Tags (Select relevant topics)</Label>
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
                                    className="rounded-full"
                                    onClick={() => handleTagToggle(tag)}
                                >
                                    {tag}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="rounded-full mt-2"
                    >
                        {loading ? "Creating..." : "Create Post"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
