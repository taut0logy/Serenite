"use client";

import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { deleteComment } from "@/actions/community";
import { useRouter } from "next/navigation";
import CommentEditForm from "./comment-edit-form";
import { Badge } from "@/components/ui/badge";

type Comment = {
    id: string;
    content: string;
    createdAt: Date;
    isAnonymous: boolean;
    isAuthor?: boolean;
    user: {
        id?: string;
        name?: string;
        username?: string;
        avatar?: string;
    };
    postId: string;
};

type CommentListProps = {
    comments: Comment[];
};

export default function CommentList({ comments }: CommentListProps) {
    if (comments.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No comments yet. Be the first to share your thoughts!
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
            ))}
        </div>
    );
}

function CommentItem({ comment }: { comment: Comment }) {
    const router = useRouter();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const result = await deleteComment(comment.id);

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Comment deleted successfully");
                router.refresh();
            }
        } catch (error) {
            console.error("Error deleting comment:", error);
            toast.error("Failed to delete comment");
        } finally {
            setIsDeleting(false);
            setDeleteDialogOpen(false);
        }
    };

    if (isEditing) {
        return (
            <CommentEditForm
                comment={comment}
                onCancel={() => setIsEditing(false)}
                onSuccess={() => setIsEditing(false)}
            />
        );
    }

    return (
        <>
            <Card className="p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex gap-3">
                    <Avatar className="h-8 w-8 border">
                        <AvatarImage src={comment.user.avatar || ""} />
                        <AvatarFallback>
                            {comment.user.name?.charAt(0) || "A"}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center flex-wrap gap-2">
                                <span className="font-medium">
                                    {comment.user.name || "Anonymous"}
                                </span>
                                {comment.isAuthor && (
                                    <Badge
                                        variant="outline"
                                        className="text-xs px-1 py-0 h-auto border-primary text-primary"
                                    >
                                        Author
                                    </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(
                                        new Date(comment.createdAt),
                                        { addSuffix: true }
                                    )}
                                </span>
                            </div>

                            {comment.isAuthor && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-full ml-2 -mr-1"
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                            <span className="sr-only">
                                                More options
                                            </span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={() => setIsEditing(true)}
                                        >
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Edit comment
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() =>
                                                setDeleteDialogOpen(true)
                                            }
                                            className="text-destructive focus:text-destructive"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete comment
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                        <div className="mt-2 whitespace-pre-wrap text-pretty">
                            {comment.content}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Are you sure you want to delete this comment?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete your comment.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
