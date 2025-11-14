import { DashboardClient } from "./dashboard-client";
import {
    getAllSupportGroupsWithStats,
    getDashboardStats,
    getAllTags,
} from "@/actions/dashboard.actions";

// Force dynamic rendering since we use auth()
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    // Fetch all data server-side
    const [supportGroups, stats, allTags] = await Promise.all([
        getAllSupportGroupsWithStats(),
        getDashboardStats(),
        getAllTags(),
    ]);

    return (
        <DashboardClient
            supportGroups={supportGroups}
            stats={stats}
            allTags={allTags}
        />
    );
}
