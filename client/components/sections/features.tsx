"use client";

import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
    Brain,
    Shield,
    Users,
    Clock,
    Heart,
    MessageSquare,
} from "lucide-react";

const features = [
    {
        icon: Brain,
        title: "Personalized Care",
        description:
            "Get matched with therapists who understand your unique needs and goals, ensuring a personalized therapeutic journey.",
        color: "from-blue-500/10 to-blue-500/5 dark:from-blue-500/20 dark:to-blue-500/10",
        iconColor: "text-blue-500",
    },
    {
        icon: Shield,
        title: "Secure & Confidential",
        description:
            "Your privacy is our priority. All sessions are encrypted and follow strict confidentiality guidelines.",
        color: "from-purple-500/10 to-purple-500/5 dark:from-purple-500/20 dark:to-purple-500/10",
        iconColor: "text-purple-500",
    },
    {
        icon: Users,
        title: "Licensed Therapists",
        description:
            "Connect with experienced, certified mental health professionals vetted for their expertise and compassion.",
        color: "from-green-500/10 to-green-500/5 dark:from-green-500/20 dark:to-green-500/10",
        iconColor: "text-green-500",
    },
    {
        icon: Clock,
        title: "Flexible Scheduling",
        description:
            "Book sessions at times that work for you, with 24/7 availability and easy rescheduling options.",
        color: "from-orange-500/10 to-orange-500/5 dark:from-orange-500/20 dark:to-orange-500/10",
        iconColor: "text-orange-500",
    },
    {
        icon: Heart,
        title: "Holistic Approach",
        description:
            "Address your mental health with a comprehensive approach that considers all aspects of your well-being.",
        color: "from-red-500/10 to-red-500/5 dark:from-red-500/20 dark:to-red-500/10",
        iconColor: "text-red-500",
    },
    {
        icon: MessageSquare,
        title: "Multiple Communication",
        description:
            "Choose from video sessions, messaging, or voice calls based on your comfort and needs.",
        color: "from-teal-500/10 to-teal-500/5 dark:from-teal-500/20 dark:to-teal-500/10",
        iconColor: "text-teal-500",
    },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
        },
    },
};

export function FeaturesSection() {
    return (
        <section className="py-24 bg-background relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.04]" />

            <div className="container mx-auto px-4">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                        Why Choose{" "}
                        <span className="text-primary dark:text-primary/90">
                            Serenite
                        </span>
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        Experience a new standard of mental health care with our
                        comprehensive features designed to support your
                        well-being journey.
                    </p>
                </motion.div>

                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                >
                    {features.map((feature, index) => (
                        <motion.div key={index} variants={itemVariants}>
                            <Card className="group relative h-full p-6 transition-all hover:shadow-lg dark:hover:shadow-primary/5">
                                {/* Gradient background */}
                                <div
                                    className={`absolute inset-0 rounded-lg bg-gradient-to-br ${feature.color} opacity-0 transition-opacity group-hover:opacity-100`}
                                />

                                {/* Content */}
                                <div className="relative z-10">
                                    <div className="mb-6">
                                        <div className="w-14 h-14 rounded-full bg-background flex items-center justify-center ring-2 ring-border group-hover:ring-primary/20 transition-all">
                                            <feature.icon
                                                className={`w-7 h-7 ${feature.iconColor} transition-transform group-hover:scale-110`}
                                            />
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-semibold text-foreground mb-3">
                                        {feature.title}
                                    </h3>
                                    <p className="text-muted-foreground">
                                        {feature.description}
                                    </p>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
