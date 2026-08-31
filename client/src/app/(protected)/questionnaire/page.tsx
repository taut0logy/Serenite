import { redirect } from "next/navigation";
import { QuestionnaireClient } from "./questionnaire-client";
import { hasCompletedAssessment, getReassessmentStatus } from "@/actions/assessment.actions";

// Force dynamic rendering since we use auth() and check fresh DB state on every visit
export const dynamic = "force-dynamic";

export default async function QuestionnairePage() {
    const completedResult = await hasCompletedAssessment();

    if (completedResult.success && completedResult.completed) {
        const statusResult = await getReassessmentStatus();
        const due = statusResult.success && statusResult.due;
        if (!due) redirect("/dashboard");
    }

    return <QuestionnaireClient />;
}
