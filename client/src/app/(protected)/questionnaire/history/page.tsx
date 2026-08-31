import { AssessmentHistoryClient } from "./history-client";
import { getAssessmentHistory } from "@/actions/assessment.actions";

export default async function AssessmentHistoryPage() {
    const result = await getAssessmentHistory();
    return <AssessmentHistoryClient assessments={result.assessments ?? []} />;
}
