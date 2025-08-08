"use server";

import prisma from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { ReactionType } from "@prisma/client";
import { revalidatePath } from "next/cache";

// Create a new post
export async function createPost({
  title,
  content,
  isAnonymous,
  tags
}: {
  title: string;
  content: string;
  isAnonymous: boolean;
  tags: string[];
}) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return { error: "Unauthorized" };
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        isAnonymous,
        tags,
        userId: user.id,
      },
    });

    revalidatePath("/community");
    return { success: "Post created successfully", post };
  } catch (error) {
    console.error("Error creating post:", error);
    return { error: "Failed to create post" };
  }
}

// Edit an existing post
export async function editPost({
  postId,
  title,
  content,
  isAnonymous,
  tags
}: {
  postId: string;
  title: string;
  content: string;
  isAnonymous: boolean;
  tags: string[];
}) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return { error: "Unauthorized" };
    }

    // Check if the post exists and belongs to the user
    const existingPost = await prisma.post.findUnique({
      where: {
        id: postId,
      },
      select: {
        userId: true,
      },
    });

    if (!existingPost) {
      return { error: "Post not found" };
    }

    if (existingPost.userId !== user.id) {
      return { error: "You don't have permission to edit this post" };
    }

    const updatedPost = await prisma.post.update({
      where: {
        id: postId,
      },
      data: {
        title,
        content,
        isAnonymous,
        tags,
      },
    });

    revalidatePath(`/community/${postId}`);
    revalidatePath("/community");
    return { success: "Post updated successfully", post: updatedPost };
  } catch (error) {
    console.error("Error updating post:", error);
    return { error: "Failed to update post" };
  }
}

// Delete a post
export async function deletePost(postId: string) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return { error: "Unauthorized" };
    }

    // Check if the post exists and belongs to the user
    const existingPost = await prisma.post.findUnique({
      where: {
        id: postId,
      },
      select: {
        userId: true,
      },
    });

    if (!existingPost) {
      return { error: "Post not found" };
    }

    if (existingPost.userId !== user.id) {
      return { error: "You don't have permission to delete this post" };
    }

    // Delete the post (This will cascade delete reactions and comments)
    await prisma.post.delete({
      where: {
        id: postId,
      },
    });

    revalidatePath("/community");
    return { success: "Post deleted successfully" };
  } catch (error) {
    console.error("Error deleting post:", error);
    return { error: "Failed to delete post" };
  }
}

// Get all posts with pagination
export async function getPosts(page = 1, pageSize = 10) {
  try {
    const skip = (page - 1) * pageSize;

    const posts = await prisma.post.findMany({
      skip,
      take: pageSize,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
        comments: {
          select: {
            id: true,
          },
        },
        reactions: {
          select: {
            type: true,
          },
        },
      },
    });

    const totalPosts = await prisma.post.count();

    return {
      posts: posts.map(post => ({
        ...post,
        user: post.isAnonymous
          ? { profile: { firstName: "Anonymous", lastName: "", avatarUrl: null } }
          : post.user,
        commentCount: post.comments.length,
        reactionCounts: getReactionCounts(post.reactions),
      })),
      totalPages: Math.ceil(totalPosts / pageSize),
      currentPage: page,
    };
  } catch (error) {
    console.error("Error fetching posts:", error);
    return { error: "Failed to fetch posts" };
  }
}

// Get a single post by ID
export async function getPostById(postId: string) {
  try {
    const user = await currentUser();
    const currentUserId = user?.id;

    const post = await prisma.post.findUnique({
      where: {
        id: postId,
      },
      include: {
        user: {
          select: {
            id: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        reactions: true,
      },
    });

    if (!post) {
      return { error: "Post not found" };
    }

    return {
      post: {
        ...post,
        isAuthor: currentUserId === post.userId,
        user: post.isAnonymous
          ? { profile: { firstName: "Anonymous", lastName: "", avatarUrl: null } }
          : post.user,
        comments: post.comments.map(comment => ({
          ...comment,
          isAuthor: currentUserId === comment.userId,
          user: comment.isAnonymous
            ? { profile: { firstName: "Anonymous", lastName: "", avatarUrl: null } }
            : comment.user,
        })),
        reactionCounts: getReactionCounts(post.reactions),
      }
    };
  } catch (error) {
    console.error("Error fetching post:", error);
    return { error: "Failed to fetch post" };
  }
}

// Add a comment to a post
export async function addComment({
  postId,
  content,
  isAnonymous
}: {
  postId: string;
  content: string;
  isAnonymous: boolean;
}) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return { error: "Unauthorized" };
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        isAnonymous,
        userId: user.id,
        postId,
      },
    });

    revalidatePath(`/community/${postId}`);
    return { success: "Comment added successfully", comment };
  } catch (error) {
    console.error("Error adding comment:", error);
    return { error: "Failed to add comment" };
  }
}

// Edit a comment
export async function editComment({
  commentId,
  content,
  isAnonymous
}: {
  commentId: string;
  content: string;
  isAnonymous: boolean;
}) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return { error: "Unauthorized" };
    }

    // Check if the comment exists and belongs to the user
    const existingComment = await prisma.comment.findUnique({
      where: {
        id: commentId,
      },
      select: {
        userId: true,
        postId: true,
      },
    });

    if (!existingComment) {
      return { error: "Comment not found" };
    }

    if (existingComment.userId !== user.id) {
      return { error: "You don't have permission to edit this comment" };
    }

    const updatedComment = await prisma.comment.update({
      where: {
        id: commentId,
      },
      data: {
        content,
        isAnonymous,
      },
    });

    revalidatePath(`/community/${existingComment.postId}`);
    return { success: "Comment updated successfully", comment: updatedComment };
  } catch (error) {
    console.error("Error updating comment:", error);
    return { error: "Failed to update comment" };
  }
}

// Delete a comment
export async function deleteComment(commentId: string) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return { error: "Unauthorized" };
    }

    // Check if the comment exists and belongs to the user
    const existingComment = await prisma.comment.findUnique({
      where: {
        id: commentId,
      },
      select: {
        userId: true,
        postId: true,
      },
    });

    if (!existingComment) {
      return { error: "Comment not found" };
    }

    if (existingComment.userId !== user.id) {
      return { error: "You don't have permission to delete this comment" };
    }

    await prisma.comment.delete({
      where: {
        id: commentId,
      },
    });

    revalidatePath(`/community/${existingComment.postId}`);
    return { success: "Comment deleted successfully" };
  } catch (error) {
    console.error("Error deleting comment:", error);
    return { error: "Failed to delete comment" };
  }
}

// Toggle a reaction on a post
export async function toggleReaction({
  postId,
  reactionType
}: {
  postId: string;
  reactionType: ReactionType;
}) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return { error: "Unauthorized" };
    }

    // Check if user already has the same reaction
    const existingReaction = await prisma.reaction.findFirst({
      where: {
        postId,
        userId: user.id,
        type: reactionType,
      },
    });

    if (existingReaction) {
      // Remove the reaction if it exists
      await prisma.reaction.delete({
        where: {
          id: existingReaction.id,
        },
      });
      revalidatePath(`/community/${postId}`);
      return { success: "Reaction removed" };
    } else {
      // Add the reaction if it doesn't exist
      const reaction = await prisma.reaction.create({
        data: {
          type: reactionType,
          userId: user.id,
          postId,
        },
      });
      revalidatePath(`/community/${postId}`);
      return { success: "Reaction added", reaction };
    }
  } catch (error) {
    console.error("Error toggling reaction:", error);
    return { error: "Failed to toggle reaction" };
  }
}

// Helper function to count reactions by type
function getReactionCounts(reactions: { type: ReactionType }[]) {
  const counts = {
    LIKE: 0,
    HEART: 0,
    SUPPORT: 0,
    HUG: 0,
    THANKS: 0,
  };

  reactions.forEach(reaction => {
    counts[reaction.type]++;
  });

  return counts;
} 