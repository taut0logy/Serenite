import { AssessmentHistoryClient } from "./history-client";
import { getAssessmentHistory } from "@/actions/assessment.actions";

// Reads the session, so it cannot be prerendered. Without this the page
// builds into a static error state instead of failing loudly.
export const dynamic = "force-dynamic";

export default async function AssessmentHistoryPage() {
    const result = await getAssessmentHistory();
    return <AssessmentHistoryClient assessments={result.assessments ?? []} />;
}
