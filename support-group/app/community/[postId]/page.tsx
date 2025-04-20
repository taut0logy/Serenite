import { getPostById } from "@/actions/community";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import PostCard from "../components/post-card";
import CommentForm from "../components/comment-form";
import CommentList from "../components/comment-list";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: { postId: string } }) {
  const { post, error } = await getPostById(params.postId);
  
  if (error || !post) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: `${post.title} | Community`,
    description: post.content.substring(0, 160),
  };
}

export default async function PostPage({ params }: { params: { postId: string } }) {
  const { post, error } = await getPostById(params.postId);
  
  if (error || !post) {
    notFound();
  }

  return (
    <div className="flex justify-center w-full">
      <div className="container max-w-3xl py-8 px-4 sm:px-6">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/community">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Community
          </Link>
        </Button>
        
        <PostCard post={post} showFullContent={true} />
        
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Comments</h2>
          <Card className="p-6">
            <CommentForm postId={params.postId} />
          </Card>
          
          <Separator className="my-8" />
          
          <CommentList comments={post.comments} />
        </div>
      </div>
    </div>
  );
} 