import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMySupportConversation } from "@/actions/support-conversation.actions";
import { CrisisContacts } from "@/components/support/crisis-contacts";
import { SupportThread } from "@/components/support/support-thread";

// Conversation state changes outside this user's control, so nothing here is
// safe to cache.
export const dynamic = "force-dynamic";

export default async function SupportPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/auth/login");

    const result = await getMySupportConversation();
    if (!result.success) {
        return (
            <main className="mx-auto w-full max-w-2xl px-4 py-10">
                <p className="text-sm text-muted-foreground">
                    We could not load your conversation just now. Please try again shortly.
                </p>
                <div className="mt-6">
                    <CrisisContacts />
                </div>
            </main>
        );
    }

    const { conversation, messages } = result.data;

    if (!conversation) {
        return (
            <main className="mx-auto w-full max-w-2xl px-4 py-10">
                <h1 className="text-2xl font-bold">One-to-one support</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    You do not have an open conversation. If you would like to talk with someone,
                    the resources below are available any time.
                </p>
                <div className="mt-6">
                    <CrisisContacts />
                </div>
            </main>
        );
    }

    const claimed = conversation.status === "CLAIMED";

    return (
        <main className="mx-auto w-full max-w-2xl px-4 py-10">
            <h1 className="text-2xl font-bold">One-to-one support</h1>
            <p className="mt-2 text-sm text-muted-foreground">
                {claimed
                    ? `${conversation.claimedByName ?? "Someone from the team"} has picked up your conversation and will reply here.`
                    : "Your conversation is waiting for someone from the team to pick it up. You can write now and they will see everything when they do."}
            </p>

            {/* Above the thread on purpose: this must be read before someone
                settles in to wait for a reply. */}
            <div className="mt-6">
                <CrisisContacts />
            </div>

            <div className="mt-6">
                <SupportThread
                    conversationId={conversation.id}
                    currentUserId={session.user.id}
                    initialMessages={messages}
                    readOnly={conversation.status === "CLOSED"}
                    emptyHint="Nothing here yet. Write whatever feels right, in your own time."
                />
            </div>
        </main>
    );
}
