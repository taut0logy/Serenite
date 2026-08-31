import type { BankItem, DomainKey } from "./types";

const CONSTANT_DISCRIMINATION = 2.0;
const THRESHOLD_SPREAD = 0.9;

// k-1 thresholds spread evenly around a center on the theta scale.
export function thresholds(center: number, categories: number): number[] {
    const half = (categories - 2) / 2;
    return Array.from({ length: categories - 1 }, (_, i) =>
        Math.round((center + (i - half) * THRESHOLD_SPREAD) * 100) / 100
    );
}

function scaleForDomain(domain: DomainKey, categories: number): string {
    if (domain === "trauma") return "yesNo";
    if (domain === "depression" || domain === "anxiety") return "frequency4";
    if (domain === "sleep") return "severity4";
    if (domain === "social") return "frequencyGeneral4";
    return "agreement4"; // selfWorth
}

export function ownItem(
    id: string,
    domain: DomainKey,
    text: string,
    contentTag: string,
    center: number,
    categories: number
): BankItem {
    return {
        id,
        domain,
        text,
        scaleId: scaleForDomain(domain, categories),
        contentTag,
        provenance: "OWN",
        isAnchor: false,
        isSafetyItem: false,
        status: "ACTIVE",
        params: { a: CONSTANT_DISCRIMINATION, b: thresholds(center, categories), source: "PROVISIONAL" },
    };
}

export function anchorItem(
    id: string,
    domain: DomainKey,
    text: string,
    contentTag: string,
    provenance: "PHQ9" | "GAD7" | "PCPTSD5",
    center: number,
    categories: number,
    isSafetyItem = false
): BankItem {
    return {
        id,
        domain,
        text,
        scaleId: scaleForDomain(domain, categories),
        contentTag,
        provenance,
        isAnchor: true,
        isSafetyItem,
        status: "ACTIVE",
        params: { a: CONSTANT_DISCRIMINATION, b: thresholds(center, categories), source: "PROVISIONAL" },
    };
}
