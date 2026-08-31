import { itemInformation, estimateTheta } from "./grm";
import type { AdministeredResponse, BankItem, StopConfig } from "./types";

const EXPOSURE_POOL_SIZE = 5;
const MIN_ITEMS = 4;
const MAX_ITEMS = 8;
const TARGET_SE = 0.32;

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

export function shouldStop(config: StopConfig): boolean {
    if (config.itemCount >= MAX_ITEMS) return true;
    if (config.itemCount < MIN_ITEMS) return false;
    return config.se <= TARGET_SE;
}

// Decides the next item for a domain: forced items (anchors, safety) first
// in bank order, then adaptive selection once those are exhausted. Only
// adaptive items count toward the stopping rule.
export function pickNext(bank: BankItem[], administered: AdministeredResponse[]): BankItem | null {
    const administeredIds = new Set(administered.map((r) => r.itemId));

    const forced = bank.find(
        (item) => (item.isAnchor || item.isSafetyItem) && !administeredIds.has(item.id)
    );
    if (forced) return forced;

    const adaptiveCount = administered.filter((r) => {
        const item = bank.find((b) => b.id === r.itemId);
        return item && !item.isAnchor && !item.isSafetyItem;
    }).length;

    const { theta, se } = estimateTheta(administered);
    if (shouldStop({ itemCount: adaptiveCount, se })) return null;

    return selectNextItem(bank, administeredIds, theta);
}
