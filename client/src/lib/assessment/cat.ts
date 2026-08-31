import { itemInformation, estimateTheta } from "./grm";
import type { DomainPolicy } from "./policy";
import type { AdministeredResponse, BankItem } from "./types";

const EXPOSURE_POOL_SIZE = 5;

// Picks the next item by max information at theta, among a randomized pool
// (exposure control) and never repeating the previous item's content tag.
export function selectNextItem(
    bank: BankItem[],
    administered: Set<string>,
    theta: number
): BankItem | null {
    let eligible = bank.filter((item) => !administered.has(item.id) && item.status === "ACTIVE");
    if (eligible.length === 0) return null;

    const lastId = Array.from(administered).pop();
    const lastItem = lastId ? bank.find((i) => i.id === lastId) : undefined;
    if (lastItem) {
        const noRepeatTag = eligible.filter((item) => item.contentTag !== lastItem.contentTag);
        if (noRepeatTag.length > 0) eligible = noRepeatTag;
    }

    const ranked = eligible
        .map((item) => ({ item, info: itemInformation(theta, item.params.a, item.params.b) }))
        .sort((a, b) => b.info - a.info)
        .slice(0, EXPOSURE_POOL_SIZE);

    return ranked[Math.floor(Math.random() * ranked.length)].item;
}

export function shouldStop(policy: DomainPolicy, itemCount: number, se: number): boolean {
    if (itemCount >= policy.maxAdaptiveItems) return true;
    if (itemCount < policy.minAdaptiveItems) return false;
    return se <= policy.targetSe;
}

/** Adaptive items only. Anchors and safety items are administered outside the rules. */
function countAdaptive(bank: BankItem[], administered: AdministeredResponse[]): number {
    return administered.filter((r) => {
        const item = bank.find((b) => b.id === r.itemId);
        return item && !item.isAnchor && !item.isSafetyItem;
    }).length;
}

// Decides the next item for a domain: forced items (anchors, safety) first in
// bank order, then adaptive selection under the domain's own policy.
export function pickNext(
    bank: BankItem[],
    administered: AdministeredResponse[],
    policy: DomainPolicy
): BankItem | null {
    const administeredIds = new Set(administered.map((r) => r.itemId));

    const forced = bank.find(
        (item) => (item.isAnchor || item.isSafetyItem) && !administeredIds.has(item.id)
    );
    if (forced) return forced;

    const adaptiveCount = countAdaptive(bank, administered);
    const estimate = estimateTheta(administered);

    if (shouldStop(policy, adaptiveCount, estimate.se)) return null;

    return selectNextItem(bank, administeredIds, estimate.theta);
}
