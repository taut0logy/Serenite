"use client";

import { useState } from "react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Mail } from "lucide-react";

const faqCategories = [
    "All",
    "Getting Started",
    "Therapy Sessions",
    "Billing",
    "Privacy",
] as const;

type Category = (typeof faqCategories)[number];

const faqs = [
    {
        question: "How do I get started with therapy?",
        answer: "Getting started is easy! Simply create an account, fill out our matching questionnaire, and we'll connect you with therapists who match your needs and preferences. The entire process takes about 10-15 minutes.",
        category: "Getting Started",
    },
    {
        question: "What types of therapy do you offer?",
        answer: "We offer various therapy approaches including CBT, DBT, psychodynamic therapy, and more. Our therapists specialize in anxiety, depression, relationships, trauma, and other areas of mental health support.",
        category: "Therapy Sessions",
    },
    {
        question: "How much does therapy cost?",
        answer: "Our therapy sessions are competitively priced and we work with many insurance providers. Prices vary based on the type of therapy and therapist experience. We also offer sliding scale options for those who qualify.",
        category: "Billing",
    },
    {
        question: "Is online therapy effective?",
        answer: "Yes! Research shows that online therapy can be just as effective as in-person therapy for many conditions. It offers convenience and accessibility while maintaining high standards of care.",
        category: "Therapy Sessions",
    },
    {
        question: "How is my privacy protected?",
        answer: "We take your privacy seriously. All sessions are encrypted and HIPAA-compliant. Your personal information and session content are kept strictly confidential according to professional standards and regulations.",
        category: "Privacy",
    },
    {
        question: "Can I change therapists if needed?",
        answer: "Absolutely! We understand the importance of finding the right fit. If you feel your current therapist isn't meeting your needs, you can request a change at any time without any additional cost.",
        category: "Getting Started",
    },
];

export function FaqSection() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<Category>("All");

    const filteredFaqs = faqs.filter((faq) => {
        const matchesSearch =
            searchQuery === "" ||
            faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
            selectedCategory === "All" || faq.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const clearFilters = () => {
        setSearchQuery("");
        setSelectedCategory("All");
    };

    return (
        <section className="py-24 bg-muted/50">
            <div className="container mx-auto px-4">
                {/* Section Header */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Frequently Asked{" "}
                        <span className="text-primary">Questions</span>
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        Find answers to common questions about our therapy
                        services
                    </p>
                </div>

                {/* Search and Categories */}
                <div className="max-w-3xl mx-auto mb-12">
                    {/* Search Bar */}
                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search FAQs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Category Filters */}
                    <div className="flex flex-wrap gap-2 justify-center">
                        {faqCategories.map((category) => (
                            <Button
                                key={category}
                                variant={
                                    selectedCategory === category
                                        ? "default"
                                        : "outline"
                                }
                                size="sm"
                                onClick={() => setSelectedCategory(category)}
                                className="rounded-full"
                            >
                                {category}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* FAQ Accordion */}
                <div className="max-w-3xl mx-auto">
                    {filteredFaqs.length > 0 ? (
                        <Accordion
                            type="single"
                            collapsible
                            className="w-full space-y-4"
                        >
                            {filteredFaqs.map((faq, index) => (
                                <AccordionItem
                                    key={index}
                                    value={`item-${index}`}
                                    className="bg-background border rounded-lg px-6"
                                >
                                    <AccordionTrigger className="hover:no-underline py-4 [&[data-state=open]>svg]:rotate-180">
                                        <span className="text-left font-medium">
                                            {faq.question}
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-4 text-muted-foreground">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground mb-4">
                                No FAQs found matching your search criteria
                            </p>
                            <Button variant="outline" onClick={clearFilters}>
                                Clear Filters
                            </Button>
                        </div>
                    )}
                </div>

                {/* Contact CTA */}
                <div className="text-center mt-12">
                    <p className="text-muted-foreground mb-4">
                        Can&apos;t find what you&apos;re looking for?
                    </p>
                    <Button variant="outline" className="gap-2">
                        <Mail className="w-4 h-4" />
                        Contact Support
                    </Button>
                </div>
            </div>
        </section>
    );
}
