/** A response that has already been given, carrying the parameters it was scored under. */
export interface AdministeredResponse {
    itemId: string;
    /** Discrimination. */
    a: number;
    /** Category thresholds, strictly increasing. Length is (categories - 1). */
    b: number[];
    /** Selected category index, 0-based. */
    value: number;
    /** Time from item render to submit. Absent for responses restored from storage. */
    responseTimeMs?: number;
}

/** A point estimate of a latent trait with its standard error. */
export interface ThetaEstimate {
    theta: number;
    se: number;
}

export type DomainKey = "depression" | "anxiety" | "trauma" | "sleep" | "social" | "selfWorth";

export interface ItemParams {
    a: number;
    b: number[];
    source: "PROVISIONAL" | "EMPIRICAL";
    n?: number;
}

export interface BankItem {
    id: string;
    domain: DomainKey;
    text: string;
    scaleId: string;
    contentTag: string;
    provenance: "OWN" | "PHQ9" | "GAD7" | "PCPTSD5";
    isAnchor: boolean;
    isSafetyItem: boolean;
    status: "DRAFT" | "ACTIVE" | "RETIRED";
    params: ItemParams;
}
