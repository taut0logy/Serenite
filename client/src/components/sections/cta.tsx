"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Sparkles, Send, ChevronRight } from "lucide-react";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.2,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5 },
    },
};

export function CtaSection() {
    return (
        <section className="relative py-24 overflow-hidden">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/90 dark:from-primary/80 dark:via-primary/70 dark:to-primary/60" />

            {/* Pattern Overlay */}
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.05] dark:opacity-[0.08]" />

            {/* Decorative Elements */}
            <div className="absolute inset-0">
                <div className="absolute top-10 left-10">
                    <motion.div
                        className="text-primary-foreground/10"
                        animate={{
                            rotate: 360,
                            scale: [1, 1.2, 1],
                        }}
                        transition={{
                            duration: 8,
                            repeat: Infinity,
                            repeatType: "reverse",
                        }}
                    >
                        <Sparkles className="w-24 h-24" />
                    </motion.div>
                </div>
                <div className="absolute bottom-10 right-10">
                    <motion.div
                        className="text-primary-foreground/10"
                        animate={{
                            rotate: -360,
                            scale: [1, 1.3, 1],
                        }}
                        transition={{
                            duration: 10,
                            repeat: Infinity,
                            repeatType: "reverse",
                        }}
                    >
                        <Sparkles className="w-32 h-32" />
                    </motion.div>
                </div>
            </div>

            <div className="container relative mx-auto px-4">
                <motion.div
                    className="max-w-4xl mx-auto text-center"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                >
                    {/* Main Content */}
                    <motion.h2
                        className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 tracking-tight"
                        variants={itemVariants}
                    >
                        Ready to Start Your Journey to{" "}
                        <span className="relative inline-block">
                            <span className="relative z-10">
                                Better Mental Health?
                            </span>
                            <span className="absolute inset-x-0 bottom-2 h-3 bg-primary-foreground/10 -rotate-1"></span>
                        </span>
                    </motion.h2>

                    <motion.p
                        className="text-xl md:text-2xl text-primary-foreground/90 mb-12 max-w-2xl mx-auto leading-relaxed"
                        variants={itemVariants}
                    >
                        Take the first step today. Our therapists are here to
                        support you every step of the way.
                    </motion.p>

                    {/* Email Signup */}
                    <motion.div
                        className="max-w-md mx-auto mb-12"
                        variants={itemVariants}
                    >
                        <div className="flex gap-3">
                            <Input
                                type="email"
                                placeholder="Enter your email"
                                className="h-12 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60 focus:border-primary-foreground/30"
                            />
                            <Button className="h-12 bg-background hover:bg-background/90 text-primary hover:text-primary/90 gap-2 whitespace-nowrap font-semibold px-6 transition-all duration-300">
                                Get Started
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </div>
                        <p className="text-primary-foreground/70 text-sm mt-2">
                            Free consultation. No credit card required.
                        </p>
                    </motion.div>

                    {/* Action Buttons */}
                    <motion.div
                        className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                        variants={itemVariants}
                    >
                        <Button
                            size="lg"
                            className="h-14 bg-background hover:bg-background/90 text-primary hover:text-primary/90 gap-2 text-lg px-8 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 group"
                        >
                            Book a Session
                            <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="h-14 border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 text-lg px-8 rounded-full font-semibold backdrop-blur-sm transition-all duration-300 group"
                        >
                            Learn More
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </motion.div>

                    {/* Trust Indicators */}
                    <motion.div
                        className="mt-16 pt-12 border-t border-primary-foreground/20"
                        variants={itemVariants}
                    >
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-center">
                            {[
                                { number: "1000+", label: "Active Clients" },
                                { number: "98%", label: "Satisfaction Rate" },
                                { number: "24/7", label: "Support Available" },
                            ].map((stat, index) => (
                                <div
                                    key={index}
                                    className="group cursor-pointer"
                                >
                                    <p className="text-3xl md:text-4xl font-bold text-primary-foreground mb-2 group-hover:scale-110 transition-transform duration-300">
                                        {stat.number}
                                    </p>
                                    <p className="text-primary-foreground/80 font-medium">
                                        {stat.label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
