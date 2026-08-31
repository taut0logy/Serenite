export interface ScaleOption {
    value: number;
    label: string;
}

export interface ResponseScale {
    id: string;
    options: ScaleOption[];
}

export const SCALES: Record<string, ResponseScale> = {
    frequency4: {
        id: "frequency4",
        options: [
            { value: 0, label: "Not at all" },
            { value: 1, label: "Several days" },
            { value: 2, label: "More than half the days" },
            { value: 3, label: "Nearly every day" },
        ],
    },
    yesNo: {
        id: "yesNo",
        options: [
            { value: 0, label: "No" },
            { value: 1, label: "Yes" },
        ],
    },
    severity4: {
        id: "severity4",
        options: [
            { value: 0, label: "Not a problem" },
            { value: 1, label: "A mild problem" },
            { value: 2, label: "A moderate problem" },
            { value: 3, label: "A severe problem" },
        ],
    },
    frequencyGeneral4: {
        id: "frequencyGeneral4",
        options: [
            { value: 0, label: "Never" },
            { value: 1, label: "Rarely" },
            { value: 2, label: "Often" },
            { value: 3, label: "Almost always" },
        ],
    },
    agreement4: {
        id: "agreement4",
        options: [
            { value: 0, label: "Strongly disagree" },
            { value: 1, label: "Disagree" },
            { value: 2, label: "Agree" },
            { value: 3, label: "Strongly agree" },
        ],
    },
};
