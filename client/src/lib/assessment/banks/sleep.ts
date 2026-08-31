// No anchor instrument. Own items only, own metric, own severity language
// (descriptive, not clinical) until empirically calibrated.
import { ownItem } from "../bank-builders";
import type { BankItem } from "../types";

export const sleepBank: BankItem[] = [
    ownItem("sl_o1", "sleep", "Trouble falling asleep at night", "onset", -0.6, 4),
    ownItem("sl_o2", "sleep", "Lying awake for a long time before you can fall asleep", "onset", -0.3, 4),
    ownItem("sl_o3", "sleep", "Waking up multiple times during the night", "maintenance", -0.2, 4),
    ownItem("sl_o4", "sleep", "Trouble getting back to sleep after waking up during the night", "maintenance", -0.1, 4),
    ownItem("sl_o5", "sleep", "Waking up earlier than you want to and not being able to fall back asleep", "earlyWaking", 0.0, 4),
    ownItem("sl_o6", "sleep", "Sleep that leaves you feeling unrefreshed", "quality", -0.4, 4),
    ownItem("sl_o7", "sleep", "A sense that your sleep is light or restless rather than deep", "quality", -0.1, 4),
    ownItem("sl_o8", "sleep", "Feeling sleepy or drowsy during the day", "daytimeImpact", -0.5, 4),
    ownItem("sl_o9", "sleep", "Needing to nap during the day to get through it", "daytimeImpact", 0.1, 4),
    ownItem("sl_o10", "sleep", "Trouble concentrating because of poor sleep", "daytimeImpact", 0.2, 4),
    ownItem("sl_o11", "sleep", "An irregular sleep schedule that shifts a lot from day to day", "routine", -0.2, 4),
    ownItem("sl_o12", "sleep", "Staying up much later than you planned to", "routine", -0.3, 4),
    ownItem("sl_o13", "sleep", "Worrying about not being able to sleep before you even go to bed", "worryAboutSleep", 0.1, 4),
    ownItem("sl_o14", "sleep", "Feeling frustrated or distressed about your sleep problems", "worryAboutSleep", 0.3, 4),
    ownItem("sl_o15", "sleep", "Waking up feeling physically tense rather than rested", "physicalRest", 0.2, 4),
];
