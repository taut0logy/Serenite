import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listSupportConversations } from "@/actions/support-conversation.actions";
import { QueueClient } from "./queue-client";

// The queue changes as other responders claim from it.
export const dynamic = "force-dynamic";

export default async function SupportQueuePage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/auth/login");

    const result = await listSupportConversations();

    // listSupportConversations refuses anyone without a responder role, so a
    // failure here is either that or a real fault. Either way there is nothing
    // to show, and the route should not advertise what it would have held.
    if (!result.success) {
        redirect("/dashboard");
    }

    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-10">
            <h1 className="text-2xl font-bold">Support queue</h1>
            <p className="mt-2 text-sm text-muted-foreground">
                Conversations opened when a member&apos;s check-in escalated. Picking one up
                makes you the person answering it, so only take what you can respond to.
            </p>

            <div className="mt-8">
                <QueueClient conversations={result.data} currentUserId={session.user.id} />
            </div>
        </main>
    );
}
