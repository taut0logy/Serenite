export interface Question {
    id: string;
    domain: string;
    text: string;
}

export interface ScaleOption {
    value: number;
    label: string;
}

export interface QuestionnaireData {
    intro: {
        title: string;
        text: string;
    };
    scale: ScaleOption[];
    questions: {
        [key: string]: Question[];
    };
}

export interface QuestionnaireResponses {
    [questionId: string]: number;
}

export type QuestionnaireState = 'intro' | 'questions' | 'completion';

export interface QuestionnaireSlideData {
    domain: string;
    questions: Question[];
}
