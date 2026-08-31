// GAD-7 wording is public domain (Spitzer/Kroenke/Williams/Lowe).
import { anchorItem, ownItem } from "../bank-builders";
import type { BankItem } from "../types";

export const anxietyBank: BankItem[] = [
    anchorItem("gad1", "anxiety", "Feeling nervous, anxious, or on edge", "nervousness", "GAD7", -0.9, 4),
    anchorItem("gad2", "anxiety", "Not being able to stop or control worrying", "worry", "GAD7", -0.5, 4),
    anchorItem("gad3", "anxiety", "Worrying too much about different things", "worry", "GAD7", -0.4, 4),
    anchorItem("gad4", "anxiety", "Trouble relaxing", "restfulness", "GAD7", -0.3, 4),
    anchorItem("gad5", "anxiety", "Being so restless that it is hard to sit still", "restlessness", "GAD7", -0.2, 4),
    anchorItem("gad6", "anxiety", "Becoming easily annoyed or irritable", "irritability", "GAD7", -0.1, 4),
    anchorItem("gad7", "anxiety", "Feeling afraid as if something awful might happen", "dread", "GAD7", 0.4, 4),

    ownItem("anx_o1", "anxiety", "Finding it hard to put your worries aside even when you try", "worry", -0.6, 4),
    ownItem("anx_o2", "anxiety", "Imagining the worst outcome in situations that are actually uncertain", "worry", -0.3, 4),
    ownItem("anx_o3", "anxiety", "Noticing your heart racing or your chest feeling tight without a clear reason", "physical", 0.1, 4),
    ownItem("anx_o4", "anxiety", "Feeling shaky, sweaty, or on edge in your body", "physical", 0.3, 4),
    ownItem("anx_o5", "anxiety", "Avoiding places or situations because they might make you anxious", "avoidance", 0.4, 4),
    ownItem("anx_o6", "anxiety", "Putting off tasks because thinking about them makes you anxious", "avoidance", 0.2, 4),
    ownItem("anx_o7", "anxiety", "Having thoughts race through your mind that are hard to slow down", "racingThoughts", -0.2, 4),
    ownItem("anx_o8", "anxiety", "Waking up already feeling a sense of dread about the day", "dread", 0.0, 4),
    ownItem("anx_o9", "anxiety", "Feeling unable to fully relax even when there is nothing pressing to do", "restfulness", -0.4, 4),
    ownItem("anx_o10", "anxiety", "Struggling to make everyday decisions because you fear getting them wrong", "decision", 0.3, 4),
    ownItem("anx_o11", "anxiety", "Having sudden waves of intense fear that come out of nowhere", "panic", 0.8, 4),
    ownItem("anx_o12", "anxiety", "Snapping at people around you because you feel wound up", "irritability", -0.1, 4),
    ownItem("anx_o13", "anxiety", "Assuming a small mistake will lead to something much worse", "catastrophic", 0.5, 4),
];
