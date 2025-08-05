"use client";

import { useAuth } from "@/hooks/use-auth";
import MeetingTypeList from "@/components/meeting/meeting-type-list";

export default function DashboardPage() {
    const { user } = useAuth();

    return (
        <div className="container mx-auto py-6 px-4">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col space-y-2">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Welcome back
                        {user?.firstName ? `, ${user.firstName}` : ""}!
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        {new Date().toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </p>
                </div>

                {/* Meeting Type List */}
                <div>
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                        Start or join a meeting
                    </h2>
                    <MeetingTypeList />
                </div>
            </div>
        </div>
    );
}
