// PHQ-9, GAD-7, PC-PTSD-5: public domain screening instruments, scored as
// published. These give the system its only severity language derived from
// a real cutoff, independent of the provisional item bank.

export type Phq9Band = "MINIMAL" | "MILD" | "MODERATE" | "MODERATELY_SEVERE" | "SEVERE";
export type Gad7Band = "MINIMAL" | "MILD" | "MODERATE" | "SEVERE";

export function scorePHQ9(values: number[]): { raw: number; band: Phq9Band } {
    const raw = values.reduce((s, v) => s + v, 0);
    let band: Phq9Band;
    if (raw <= 4) band = "MINIMAL";
    else if (raw <= 9) band = "MILD";
    else if (raw <= 14) band = "MODERATE";
    else if (raw <= 19) band = "MODERATELY_SEVERE";
    else band = "SEVERE";
    return { raw, band };
}

export function scoreGAD7(values: number[]): { raw: number; band: Gad7Band } {
    const raw = values.reduce((s, v) => s + v, 0);
    let band: Gad7Band;
    if (raw <= 4) band = "MINIMAL";
    else if (raw <= 9) band = "MILD";
    else if (raw <= 14) band = "MODERATE";
    else band = "SEVERE";
    return { raw, band };
}

const PCPTSD5_CUTOFF = 3;

export function scorePCPTSD5(values: number[]): { raw: number; positiveScreen: boolean } {
    const raw = values.reduce((s, v) => s + v, 0);
    return { raw, positiveScreen: raw >= PCPTSD5_CUTOFF };
}
