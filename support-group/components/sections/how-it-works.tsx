"use client";

import { motion } from "framer-motion";
import { ClipboardList, Users, MessageSquare, Check, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: ClipboardList,
    title: "Complete Quick Assessment",
    description: "Take a brief questionnaire to help us understand your needs and preferences for therapy.",
    color: "text-blue-500",
    gradient: "from-blue-500/10 via-blue-500/5 to-transparent",
  },
  {
    icon: Users,
    title: "Match with Therapists",
    description: "Get matched with licensed professionals who specialize in your areas of concern.",
    color: "text-purple-500",
    gradient: "from-purple-500/10 via-purple-500/5 to-transparent",
  },
  {
    icon: MessageSquare,
    title: "Begin Your Journey",
    description: "Schedule your first session and start your path to better mental well-being.",
    color: "text-teal-500",
    gradient: "from-teal-500/10 via-teal-500/5 to-transparent",
  },
  {
    icon: Check,
    title: "Ongoing Support",
    description: "Receive continuous support and track your progress with regular check-ins.",
    color: "text-green-500",
    gradient: "from-green-500/10 via-green-500/5 to-transparent",
  },
];

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
    transition: {
      duration: 0.5,
    },
  },
};

export function HowItWorksSection() {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.04]" />

      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Start Your Journey in{" "}
            <span className="text-primary dark:text-primary/90">Four Simple Steps</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We've made it easy to get started with therapy. Here's how our process works.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {steps.map((step, index) => (
            <motion.div key={index} variants={itemVariants} className="relative">
              {/* Step Content */}
              <div className="relative z-10 h-full">
                <div className="flex flex-col items-center text-center group">
                  {/* Icon Container */}
                  <div className="relative mb-6">
                    {/* Step Number */}
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background border-2 border-primary flex items-center justify-center text-sm font-semibold text-primary">
                      {index + 1}
                    </div>
                    {/* Icon */}
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-b ${step.gradient} flex items-center justify-center transform transition-transform group-hover:scale-110 duration-300`}>
                      <step.icon className={`w-8 h-8 ${step.color}`} />
                    </div>
                  </div>

                  {/* Text Content */}
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {step.description}
                  </p>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-20 left-[60%] w-[80%] h-[2px]">
                    <div className="relative w-full h-full">
                      <motion.div
                        className="absolute inset-0 bg-border"
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                      />
                      <motion.div
                        className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 rotate-45 border-t-2 border-r-2 border-border"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: 1 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Call to Action */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <p className="text-lg text-muted-foreground mb-6">
            Ready to take the first step towards better mental health?
          </p>
          <button className="inline-flex items-center gap-2 text-primary hover:text-primary/90 font-semibold group">
            Get Started Now
            <ArrowRight className="w-4 h-4 transform transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>
      </div>
    </section>
  );
} 