import { describe, it, expect } from "vitest";
import { pickNext } from "@/lib/assessment/cat";
import { itemInformation } from "@/lib/assessment/grm";
import { BANKS_BY_DOMAIN } from "@/lib/assessment/banks";
import { POLICY_BY_DOMAIN } from "@/lib/assessment/policy";
import { DOMAIN_ORDER } from "@/lib/assessment/session";
import type { AdministeredResponse } from "@/lib/assessment/types";

describe("POLICY_BY_DOMAIN", () => {
    it("gives the severity-bearing domains the high precision target", () => {
        expect(POLICY_BY_DOMAIN.depression.targetSe).toBe(0.32);
        expect(POLICY_BY_DOMAIN.anxiety.targetSe).toBe(0.32);
    });

    it("gives matching-only domains a target their banks can actually reach", () => {
        for (const domain of ["trauma", "sleep", "social", "selfWorth"] as const) {
            expect(POLICY_BY_DOMAIN[domain].targetSe).toBe(0.45);
        }
    });

    /**
     * The defect this policy exists to fix: a target is worthless if the cap
     * binds first. Reaching SE t needs 1/t^2 - 1 information beyond the prior,
     * and the best case is every item answered at its most informative point.
     * If even that best case needs more items than the cap allows, the
     * precision test can never fire and the domain always runs to the cap.
     */
    it("sets a target every domain can reach inside its own item cap", () => {
        for (const domain of DOMAIN_ORDER) {
            const { targetSe, maxAdaptiveItems } = POLICY_BY_DOMAIN[domain];
            const required = 1 / (targetSe * targetSe) - 1;

            const anchorInfo = BANKS_BY_DOMAIN[domain]
                .filter((i) => i.isAnchor || i.isSafetyItem)
                .reduce((sum, i) => sum + itemInformation(0, i.params.a, i.params.b), 0);

            const bestAdaptive = BANKS_BY_DOMAIN[domain]
                .filter((i) => !i.isAnchor && !i.isSafetyItem)
                .map((i) => itemInformation(0, i.params.a, i.params.b))
                .sort((a, b) => b - a)
                .slice(0, maxAdaptiveItems)
                .reduce((sum, info) => sum + info, 0);

            expect(anchorInfo + bestAdaptive).toBeGreaterThanOrEqual(required);
        }
    });
});

describe("stopping under the new targets", () => {
    const answered = (id: string, value: number): AdministeredResponse => {
        const item = BANKS_BY_DOMAIN.sleep.find((i) => i.id === id)!;
        return { itemId: id, a: item.params.a, b: item.params.b, value };
    };

    it("stops a matching-only domain before the cap once its target is met", () => {
        const administered: AdministeredResponse[] = [];
        let item = pickNext(BANKS_BY_DOMAIN.sleep, administered, POLICY_BY_DOMAIN.sleep);

        while (item) {
            administered.push(answered(item.id, 2));
            item = pickNext(BANKS_BY_DOMAIN.sleep, administered, POLICY_BY_DOMAIN.sleep);
        }

        expect(administered.length).toBeLessThan(POLICY_BY_DOMAIN.sleep.maxAdaptiveItems);
        expect(administered.length).toBeGreaterThanOrEqual(POLICY_BY_DOMAIN.sleep.minAdaptiveItems);
    });
});
