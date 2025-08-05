"use client";

import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { MessageCircle, Heart, ThumbsUp, Users, Award, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { ReactionType } from "@prisma/client";
import { toggleReaction, deletePost } from "@/actions/community";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
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
import EditPostDialog from "./edit-post-dialog";

type PostCardProps = {
  post: {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
    isAnonymous: boolean;
    isAuthor?: boolean;
    user: {
      id?: string;
      name?: string;
      avatar?: string;
    };
    commentCount: number;
    reactionCounts: Record<ReactionType, number>;
    tags: string[];
  };
  showFullContent?: boolean;
};

export default function PostCard({ post, showFullContent = false }: PostCardProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const maxContentLength = 300;
  const contentPreview = post.content.length > maxContentLength && !showFullContent
    ? `${post.content.substring(0, maxContentLength)}...`
    : post.content;
  
  const handleReaction = async (reactionType: ReactionType) => {
    try {
      const result = await toggleReaction({
        postId: post.id,
        reactionType,
      });
      
      if (result.error) {
        toast.error(result.error);
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("Error adding reaction:", error);
      toast.error("Failed to add reaction");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deletePost(post.id);
      
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Post deleted successfully");
        if (showFullContent) {
          router.push('/community');
        } else {
          router.refresh();
        }
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <Card className="w-full shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="h-10 w-10 border">
                <AvatarImage src={post.user.avatar || ""} />
                <AvatarFallback>{post.user.name?.charAt(0) || "A"}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="leading-tight">
                  <Link href={`/community/${post.id}`} className="hover:underline">
                    {post.title}
                  </Link>
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <span>{post.user.name || "Anonymous"}</span>
                  {post.isAuthor && (
                    <Badge variant="outline" className="text-xs px-1 py-0 h-auto border-primary text-primary">
                      Author
                    </Badge>
                  )}
                  <span>• {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                </CardDescription>
              </div>
            </div>
            
            {post.isAuthor && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit post
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete post
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent className="py-3">
          <div className="mb-4 whitespace-pre-wrap text-pretty">
            {contentPreview}
            {post.content.length > maxContentLength && !showFullContent && (
              <Button variant="link" asChild className="px-0 text-primary">
                <Link href={`/community/${post.id}`}>Read more</Link>
              </Button>
            )}
          </div>
          
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="rounded-full">{tag}</Badge>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t pt-3 flex flex-wrap gap-2 justify-between">
          <div className="flex flex-wrap gap-1 md:gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn("rounded-full", post.reactionCounts.LIKE > 0 && "text-blue-500")}
              onClick={() => handleReaction(ReactionType.LIKE)}
            >
              <ThumbsUp className="h-4 w-4 mr-1" />
              {post.reactionCounts.LIKE > 0 && post.reactionCounts.LIKE}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn("rounded-full", post.reactionCounts.HEART > 0 && "text-red-500")}
              onClick={() => handleReaction(ReactionType.HEART)}
            >
              <Heart className="h-4 w-4 mr-1" />
              {post.reactionCounts.HEART > 0 && post.reactionCounts.HEART}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn("rounded-full", post.reactionCounts.SUPPORT > 0 && "text-purple-500")}
              onClick={() => handleReaction(ReactionType.SUPPORT)}
            >
              <Users className="h-4 w-4 mr-1" />
              {post.reactionCounts.SUPPORT > 0 && post.reactionCounts.SUPPORT}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn("rounded-full", post.reactionCounts.THANKS > 0 && "text-amber-500")}
              onClick={() => handleReaction(ReactionType.THANKS)}
            >
              <Award className="h-4 w-4 mr-1" />
              {post.reactionCounts.THANKS > 0 && post.reactionCounts.THANKS}
            </Button>
          </div>
          
          <Button variant="ghost" size="sm" asChild className="rounded-full">
            <Link href={`/community/${post.id}`}>
              <MessageCircle className="h-4 w-4 mr-1" />
              {post.commentCount > 0 && post.commentCount} {post.commentCount === 1 ? "Comment" : "Comments"}
            </Link>
          </Button>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your post and all its comments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
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

      {/* Edit Post Dialog */}
      <EditPostDialog 
        post={post} 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen} 
      />
    </>
  );
} 