// PC-PTSD-5 wording is public domain (US Dept of Veterans Affairs). Domain
// stays binary (yes/no) to match the anchor's native format.
// The exposure gate is administered before this bank; if not endorsed, the
// whole domain is skipped. See scoring.ts.
import { anchorItem, ownItem } from "../bank-builders";
import type { BankItem } from "../types";

export const TRAUMA_EXPOSURE_GATE =
    "Have you ever experienced or witnessed an event that involved actual or threatened death, serious injury, or sexual violence, including a close call?";

export const traumaBank: BankItem[] = [
    anchorItem("pt_a1", "trauma", "Had nightmares about the event, or thought about it when you did not want to", "intrusion", "PCPTSD5", -0.3, 2),
    anchorItem("pt_a2", "trauma", "Tried hard not to think about the event, or avoided situations that reminded you of it", "avoidance", "PCPTSD5", -0.1, 2),
    anchorItem("pt_a3", "trauma", "Been constantly on guard, watchful, or easily startled", "hyperarousal", "PCPTSD5", 0.1, 2),
    anchorItem("pt_a4", "trauma", "Felt numb or detached from people, activities, or your surroundings", "numbing", "PCPTSD5", 0.2, 2),
    anchorItem("pt_a5", "trauma", "Felt guilty or unable to stop blaming yourself or others for the event", "negativeCognition", "PCPTSD5", 0.4, 2),

    ownItem("tr_o1", "trauma", "Had sudden vivid memories of the event come back to you unexpectedly", "intrusion", -0.2, 2),
    ownItem("tr_o2", "trauma", "Felt intense distress when something reminded you of the event", "intrusion", 0.0, 2),
    ownItem("tr_o3", "trauma", "Avoided talking about the event even when it came up", "avoidance", 0.1, 2),
    ownItem("tr_o4", "trauma", "Stayed away from places that reminded you of what happened", "avoidance", -0.1, 2),
    ownItem("tr_o5", "trauma", "Had trouble falling asleep because your mind kept replaying the event", "hyperarousal", 0.2, 2),
    ownItem("tr_o6", "trauma", "Felt jumpy or easily startled by ordinary sounds or movements", "hyperarousal", -0.3, 2),
    ownItem("tr_o7", "trauma", "Felt disconnected from people who are close to you", "numbing", 0.3, 2),
    ownItem("tr_o8", "trauma", "Found it hard to feel positive emotions since the event", "numbing", 0.4, 2),
    ownItem("tr_o9", "trauma", "Believed the world is far more dangerous than you used to think", "negativeCognition", 0.5, 2),
    ownItem("tr_o10", "trauma", "Blamed yourself for something that happened that was not fully your fault", "negativeCognition", 0.6, 2),
];
