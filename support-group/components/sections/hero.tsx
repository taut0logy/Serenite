"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
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

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background with gradient and pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-background to-primary/5 dark:from-background dark:to-primary/10" />
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] dark:opacity-[0.05]" />

      {/* Content */}
      <motion.div
        className="container mx-auto px-4 pt-20 text-center relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Decorative elements */}
        <motion.div
          className="absolute top-10 left-1/4 text-primary/20 dark:text-primary/10"
          animate={{
            rotate: 360,
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        >
          <Sparkles className="w-12 h-12" />
        </motion.div>

        <motion.div
          className="absolute bottom-10 right-1/4 text-primary/20 dark:text-primary/10"
          animate={{
            rotate: -360,
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        >
          <Sparkles className="w-8 h-8" />
        </motion.div>

        {/* Main content */}
        <motion.h1
          className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6"
          variants={itemVariants}
        >
          Find Your Path to{" "}
          <span className="text-primary dark:text-primary/90">Mental Wellness</span>
        </motion.h1>

        <motion.p
          className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto"
          variants={itemVariants}
        >
          Personalized therapy for every step of your journey, with licensed professionals who care.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          variants={itemVariants}
        >
          <Button
            size="lg"
            className="text-lg px-8 py-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground group"
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-lg px-8 py-6 rounded-full border-primary text-primary hover:bg-primary/10 dark:border-primary/50 dark:text-primary/90"
          >
            Learn More
          </Button>
        </motion.div>

        {/* Stats or trust indicators */}
        <motion.div
          className="mt-16 grid grid-cols-2 md:grid-cols-3 gap-8 max-w-3xl mx-auto"
          variants={itemVariants}
        >
          {[
            { number: "1000+", label: "Active Clients" },
            { number: "500+", label: "Licensed Therapists" },
            { number: "98%", label: "Client Satisfaction" },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-primary dark:text-primary/90">
                {stat.number}
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
} 