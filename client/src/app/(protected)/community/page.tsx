import { Suspense } from "react";
import PostList from "@/components/community/post-list";
import CreatePostButton from "@/components/community/create-post-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/ui/heading";

export default async function CommunityPage({
    searchParams,
}: {
    searchParams: { page?: string };
}) {
    const page = searchParams.page ? parseInt(searchParams.page) : 1;

    return (
        <div className="flex justify-center w-full">
            <div className="container max-w-4xl py-8 px-4 sm:px-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <Heading
                            title="Community Support"
                            description="Share your thoughts and get support from the community"
                        />
                    </div>
                    <CreatePostButton />
                </div>
                <Separator className="my-4" />

                <div className="mb-8">
                    <Tabs defaultValue="all" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 max-w-md mx-auto">
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="mental-health">
                                Mental Health
                            </TabsTrigger>
                            <TabsTrigger value="anxiety">Anxiety</TabsTrigger>
                            <TabsTrigger value="depression">
                                Depression
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="all">
                            <Suspense
                                fallback={
                                    <div className="mt-8 text-center">
                                        Loading posts...
                                    </div>
                                }
                            >
                                <PostList initialPage={page} />
                            </Suspense>
                        </TabsContent>
                        <TabsContent value="mental-health">
                            <div className="mt-4 text-center">
                                Filter by Mental Health posts (feature in
                                development)
                            </div>
                        </TabsContent>
                        <TabsContent value="anxiety">
                            <div className="mt-4 text-center">
                                Filter by Anxiety posts (feature in development)
                            </div>
                        </TabsContent>
                        <TabsContent value="depression">
                            <div className="mt-4 text-center">
                                Filter by Depression posts (feature in
                                development)
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
