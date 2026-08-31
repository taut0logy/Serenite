// No anchor instrument. Merges self-esteem and cognitive-distortion content
// into one domain since they measured overlapping constructs. All items
// worded so agreement means more distress; no reverse keying.
import { ownItem } from "../bank-builders";
import type { BankItem } from "../types";

export const selfWorthBank: BankItem[] = [
    ownItem("sw_o1", "selfWorth", "I am harder on myself than I would ever be on someone else", "selfCriticism", -0.5, 4),
    ownItem("sw_o2", "selfWorth", "When I make a mistake, my first thought is that I am not good enough", "selfCriticism", -0.2, 4),
    ownItem("sw_o3", "selfWorth", "I doubt whether I bring much value to the people around me", "worth", -0.1, 4),
    ownItem("sw_o4", "selfWorth", "I struggle to name things I actually like about myself", "worth", -0.3, 4),
    ownItem("sw_o5", "selfWorth", "I think of myself as a failure more often than I would like", "failure", 0.1, 4),
    ownItem("sw_o6", "selfWorth", "One setback is enough to make me feel like giving up on something", "failure", 0.3, 4),
    ownItem("sw_o7", "selfWorth", "I assume people are judging me negatively without any real evidence", "mindReading", -0.2, 4),
    ownItem("sw_o8", "selfWorth", "I convince myself I know what someone is thinking about me, and it is usually bad", "mindReading", 0.0, 4),
    ownItem("sw_o9", "selfWorth", "When something goes wrong, I expect it to spiral into something worse", "catastrophizing", 0.2, 4),
    ownItem("sw_o10", "selfWorth", "A single piece of bad news makes me assume everything else will go wrong too", "catastrophizing", 0.4, 4),
    ownItem("sw_o11", "selfWorth", "I take responsibility for problems that were not really within my control", "personalization", -0.1, 4),
    ownItem("sw_o12", "selfWorth", "I blame myself when something goes wrong, even when others were involved", "personalization", 0.1, 4),
    ownItem("sw_o13", "selfWorth", "One bad experience makes me expect the same thing to happen every time", "overgeneralization", -0.2, 4),
    ownItem("sw_o14", "selfWorth", "I use words like always or never when describing my own failures", "overgeneralization", 0.0, 4),
    ownItem("sw_o15", "selfWorth", "I feel like I cannot really change the way I am", "hopelessAboutSelf", 0.5, 4),
    ownItem("sw_o16", "selfWorth", "I feel like nothing I do will be good enough in the end", "hopelessAboutSelf", 0.4, 4),
    ownItem("sw_o17", "selfWorth", "I compare myself to other people and come up short", "comparison", -0.3, 4),
    ownItem("sw_o18", "selfWorth", "Seeing other people succeed makes me feel worse about myself", "comparison", -0.1, 4),
    ownItem("sw_o19", "selfWorth", "I feel like anything less than perfect is a failure", "perfectionism", 0.2, 4),
    ownItem("sw_o20", "selfWorth", "When someone compliments me, I assume they are just being polite", "discountingPositives", 0.1, 4),
];
