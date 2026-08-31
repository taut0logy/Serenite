// No anchor instrument. Own items only, own metric.
import { ownItem } from "../bank-builders";
import type { BankItem } from "../types";

export const socialBank: BankItem[] = [
    ownItem("so_o1", "social", "Avoiding social gatherings even when you would like to go", "avoidance", -0.2, 4),
    ownItem("so_o2", "social", "Making an excuse to leave a social situation early", "avoidance", 0.0, 4),
    ownItem("so_o3", "social", "Feeling anxious before meeting up with people, even people you know well", "anxietyInGroups", -0.3, 4),
    ownItem("so_o4", "social", "Feeling your mind go blank when talking in a group", "anxietyInGroups", 0.2, 4),
    ownItem("so_o5", "social", "Going days without meaningfully talking to another person", "isolation", 0.3, 4),
    ownItem("so_o6", "social", "Feeling like you are pulling away from friends or family", "isolation", 0.1, 4),
    ownItem("so_o7", "social", "Feeling like no one really understands what you are going through", "connectionQuality", 0.0, 4),
    ownItem("so_o8", "social", "Feeling lonely even when you are around other people", "connectionQuality", 0.2, 4),
    ownItem("so_o9", "social", "Struggling to start a conversation with someone new", "communicationDifficulty", -0.1, 4),
    ownItem("so_o10", "social", "Avoiding phone calls in favor of texting because talking feels harder", "communicationDifficulty", -0.2, 4),
    ownItem("so_o11", "social", "Replaying a conversation afterward and worrying about what you said", "selfMonitoring", -0.4, 4),
    ownItem("so_o12", "social", "Rehearsing what you are going to say before a conversation", "selfMonitoring", -0.3, 4),
    ownItem("so_o13", "social", "Feeling like you have no one to reach out to when things are hard", "support", 0.4, 4),
    ownItem("so_o14", "social", "Hesitating to ask for help even when you need it", "support", 0.1, 4),
    ownItem("so_o15", "social", "Feeling on edge in a room full of people you do not know well", "groupComfort", -0.1, 4),
];
