import { describe, it, expect } from "vitest";
import {
    createSession,
    nextStep,
    recordResponse,
    recordTraumaGate,
    recordPriorities,
    isValidPriorityRanking,
    finalizeThetas,
    undoLast,
} from "@/lib/assessment/session";
import type { BankItem, DomainKey } from "@/lib/assessment/types";

function item(id: string, domain: DomainKey, opts: Partial<BankItem> = {}): BankItem {
    return {
        id,
        domain,
        text: id,
        scaleId: "frequency4",
        contentTag: id,
        provenance: "OWN",
        isAnchor: false,
        isSafetyItem: false,
        status: "ACTIVE",
        params: { a: 1.5, b: [-1, 0, 1], source: "PROVISIONAL" },
        ...opts,
    };
}

// Small fixture banks, no anchors. At a=1.5 the target SE is not reachable
// within the item budget, so every domain runs to the MAX_ITEMS cap (8).
function fixtureBank(domain: DomainKey, count = 9): BankItem[] {
    return Array.from({ length: count }, (_, i) => item(`${domain}${i}`, domain));
}

const BANKS: Record<DomainKey, BankItem[]> = {
    depression: fixtureBank("depression"),
    anxiety: fixtureBank("anxiety"),
    trauma: fixtureBank("trauma"),
    sleep: fixtureBank("sleep"),
    social: fixtureBank("social"),
    selfWorth: fixtureBank("selfWorth"),
};

const respond = (domain: DomainKey, itemId: string, value = 1) => ({
    itemId,
    a: 1.5,
    b: [-1, 0, 1],
    value,
});

function answerDomain(session: ReturnType<typeof createSession>, banks: typeof BANKS, domain: DomainKey) {
    let s = session;
    for (let i = 0; i < 8; i++) {
        const step = nextStep(banks, s);
        if (step.type !== "item" || step.domain !== domain) break;
        s = recordResponse(s, domain, respond(domain, step.item.id));
    }
    return s;
}

describe("nextStep", () => {
    it("starts with the first depression item", () => {
        const step = nextStep(BANKS, createSession());
        expect(step).toMatchObject({ type: "item", domain: "depression" });
    });

    it("moves to anxiety once depression is exhausted", () => {
        let s = answerDomain(createSession(), BANKS, "depression");
        const step = nextStep(BANKS, s);
        expect(step).toMatchObject({ type: "item", domain: "anxiety" });
    });

    it("asks the trauma gate before any trauma item", () => {
        let s = answerDomain(createSession(), BANKS, "depression");
        s = answerDomain(s, BANKS, "anxiety");
        expect(nextStep(BANKS, s)).toEqual({ type: "traumaGate" });
    });

    it("skips the entire trauma domain when the gate is not endorsed", () => {
        let s = answerDomain(createSession(), BANKS, "depression");
        s = answerDomain(s, BANKS, "anxiety");
        s = recordTraumaGate(s, false);
        const step = nextStep(BANKS, s);
        expect(step).toMatchObject({ type: "item", domain: "sleep" });
    });

    it("administers trauma items when the gate is endorsed", () => {
        let s = answerDomain(createSession(), BANKS, "depression");
        s = answerDomain(s, BANKS, "anxiety");
        s = recordTraumaGate(s, true);
        const step = nextStep(BANKS, s);
        expect(step).toMatchObject({ type: "item", domain: "trauma" });
    });

    it("asks for priorities once every domain is done", () => {
        let s = createSession();
        for (const domain of ["depression", "anxiety"] as const) s = answerDomain(s, BANKS, domain);
        s = recordTraumaGate(s, false);
        for (const domain of ["sleep", "social", "selfWorth"] as const) s = answerDomain(s, BANKS, domain);
        expect(nextStep(BANKS, s)).toEqual({ type: "priorities" });
    });

    it("is done once priorities are recorded", () => {
        let s = createSession();
        for (const domain of ["depression", "anxiety"] as const) s = answerDomain(s, BANKS, domain);
        s = recordTraumaGate(s, false);
        for (const domain of ["sleep", "social", "selfWorth"] as const) s = answerDomain(s, BANKS, domain);
        s = recordPriorities(s, ["mood", "worry", "sleep", "connection", "selfCriticism"]);
        expect(nextStep(BANKS, s)).toEqual({ type: "done" });
    });
});

describe("isValidPriorityRanking", () => {
    it("accepts a full ranking with no duplicates", () => {
        expect(isValidPriorityRanking(["mood", "worry", "sleep", "connection", "selfCriticism"])).toBe(true);
    });

    it("rejects a short ranking", () => {
        expect(isValidPriorityRanking(["mood", "worry"])).toBe(false);
    });

    it("rejects a ranking with a duplicate", () => {
        expect(isValidPriorityRanking(["mood", "mood", "sleep", "connection", "selfCriticism"])).toBe(false);
    });
});

describe("undoLast", () => {
    it("removes the most recent response so the item is eligible again", () => {
        const s0 = createSession();
        const first = nextStep(BANKS, s0) as { type: "item"; domain: DomainKey; item: { id: string } };
        const s1 = recordResponse(s0, "depression", respond("depression", first.item.id));
        expect(s1.responses.depression).toHaveLength(1);

        const s2 = undoLast(s1);
        expect(s2.responses.depression ?? []).toHaveLength(0);
        const again = nextStep(BANKS, s2);
        expect(again.type).toBe("item");
    });

    it("undoes the trauma gate answer", () => {
        let s = answerDomain(createSession(), BANKS, "depression");
        s = answerDomain(s, BANKS, "anxiety");
        s = recordTraumaGate(s, false);

        s = undoLast(s);
        expect(nextStep(BANKS, s)).toEqual({ type: "traumaGate" });
    });

    it("undoes recorded priorities", () => {
        let s = createSession();
        for (const domain of ["depression", "anxiety"] as const) s = answerDomain(s, BANKS, domain);
        s = recordTraumaGate(s, false);
        for (const domain of ["sleep", "social", "selfWorth"] as const) s = answerDomain(s, BANKS, domain);
        s = recordPriorities(s, ["mood", "worry", "sleep", "connection", "selfCriticism"]);

        s = undoLast(s);
        expect(nextStep(BANKS, s)).toEqual({ type: "priorities" });
    });

    it("is a no-op on a fresh session", () => {
        const s = createSession();
        expect(undoLast(s)).toEqual(s);
    });
});

describe("finalizeThetas", () => {
    it("returns a theta estimate only for domains with responses", () => {
        const s = answerDomain(createSession(), BANKS, "depression");
        const result = finalizeThetas(s);
        expect(result.depression).toBeDefined();
        expect(result.anxiety).toBeUndefined();
    });
});
