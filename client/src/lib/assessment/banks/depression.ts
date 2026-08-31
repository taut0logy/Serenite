// PHQ-9 wording is public domain (Pfizer, Spitzer/Kroenke/Williams). Item 9
// (suicidality) is a safety item and is excluded from adaptive selection.
import { anchorItem, ownItem } from "../bank-builders";
import type { BankItem } from "../types";

export const depressionBank: BankItem[] = [
    anchorItem("phq1", "depression", "Little interest or pleasure in doing things", "anhedonia", "PHQ9", -1.1, 4),
    anchorItem("phq2", "depression", "Feeling down, depressed, or hopeless", "mood", "PHQ9", -0.6, 4),
    anchorItem("phq3", "depression", "Trouble falling or staying asleep, or sleeping too much", "sleep", "PHQ9", -0.4, 4),
    anchorItem("phq4", "depression", "Feeling tired or having little energy", "energy", "PHQ9", -0.7, 4),
    anchorItem("phq5", "depression", "Poor appetite or overeating", "appetite", "PHQ9", -0.2, 4),
    anchorItem("phq6", "depression", "Feeling bad about yourself, or that you are a failure, or have let yourself or your family down", "guilt", "PHQ9", 0.3, 4),
    anchorItem("phq7", "depression", "Trouble concentrating on things, such as reading or watching television", "concentration", "PHQ9", -0.1, 4),
    anchorItem("phq8", "depression", "Moving or speaking so slowly that other people could have noticed, or being so fidgety or restless that you have been moving around a lot more than usual", "psychomotor", "PHQ9", 0.5, 4),
    anchorItem("phq9", "depression", "Thoughts that you would be better off dead, or of hurting yourself in some way", "suicidality", "PHQ9", 1.2, 4, true),

    ownItem("dep_o1", "depression", "Not enjoying activities that used to interest you", "anhedonia", -1.0, 4),
    ownItem("dep_o2", "depression", "Losing motivation to start things you normally care about", "anhedonia", -0.8, 4),
    ownItem("dep_o3", "depression", "Feeling sad or low for much of the day", "mood", -0.5, 4),
    ownItem("dep_o4", "depression", "Feeling like nothing will get better", "mood", 0.1, 4),
    ownItem("dep_o5", "depression", "Waking up much earlier than planned and not being able to fall back asleep", "sleep", -0.3, 4),
    ownItem("dep_o6", "depression", "Feeling drained even after resting", "energy", -0.6, 4),
    ownItem("dep_o7", "depression", "Struggling to get through everyday tasks because of low energy", "energy", -0.2, 4),
    ownItem("dep_o8", "depression", "Eating much more or much less than usual", "appetite", -0.2, 4),
    ownItem("dep_o9", "depression", "Dwelling on things you feel you did wrong", "guilt", 0.3, 4),
    ownItem("dep_o10", "depression", "Losing your train of thought partway through a task", "concentration", -0.1, 4),
    ownItem("dep_o11", "depression", "Moving or speaking more slowly than usual, or feeling restless and unable to settle", "psychomotor", 0.5, 4),
];
