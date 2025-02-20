"use client";

import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Quote, ChevronLeft, ChevronRight, User } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Client",
    bgColor: "bg-blue-500",
    initials: "SJ",
    content: "MindfulSupport transformed my approach to mental health. The therapists are incredibly compassionate and professional. I've seen real progress in my journey.",
    rating: 5,
  },
  {
    name: "Michael Chen",
    role: "Client",
    bgColor: "bg-purple-500",
    initials: "MC",
    content: "Finding the right therapist was so easy with MindfulSupport. The matching process is spot-on, and the platform is incredibly user-friendly.",
    rating: 5,
  },
  {
    name: "Emily Rodriguez",
    role: "Client",
    bgColor: "bg-teal-500",
    initials: "ER",
    content: "The flexibility of online sessions has made therapy accessible for my busy schedule. It's been a game-changer for my mental well-being.",
    rating: 5,
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
  },
};

export function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const nextTestimonial = () => {
    if (!isAnimating) {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }
  };

  const prevTestimonial = () => {
    if (!isAnimating) {
      setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    }
  };

  useEffect(() => {
    const timer = setInterval(nextTestimonial, 8000); // Auto advance every 8 seconds
    return () => clearInterval(timer);
  }, []);

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
            What Our{" "}
            <span className="text-primary dark:text-primary/90">Clients Say</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Real stories from people who have transformed their lives through therapy
          </p>
        </motion.div>

        {/* Testimonials Carousel */}
        <div className="max-w-4xl mx-auto relative">
          {/* Large quote icon */}
          <Quote className="absolute -top-6 -left-4 w-16 h-16 text-primary/10 dark:text-primary/5" />

          {/* Carousel */}
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
                onAnimationStart={() => setIsAnimating(true)}
                onAnimationComplete={() => setIsAnimating(false)}
                className="relative"
              >
                <Card className="p-8 md:p-10">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className={`w-20 h-20 mb-6 ${testimonials[activeIndex].bgColor}`}>
                      <AvatarFallback className="text-white text-xl font-semibold">
                        {testimonials[activeIndex].initials}
                      </AvatarFallback>
                    </Avatar>

                    <p className="text-lg md:text-xl text-foreground mb-6 italic">
                      "{testimonials[activeIndex].content}"
                    </p>

                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(testimonials[activeIndex].rating)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-5 h-5 fill-primary text-primary"
                          aria-hidden="true"
                        />
                      ))}
                    </div>

                    <div>
                      <h3 className="font-semibold text-foreground">
                        {testimonials[activeIndex].name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {testimonials[activeIndex].role}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-center gap-4 mt-8">
              <Button
                variant="outline"
                size="icon"
                onClick={prevTestimonial}
                className="rounded-full hover:bg-primary/10 hover:text-primary"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              {/* Dots */}
              <div className="flex items-center gap-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === activeIndex
                        ? "bg-primary w-6"
                        : "bg-primary/20 hover:bg-primary/40"
                    }`}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={nextTestimonial}
                className="rounded-full hover:bg-primary/10 hover:text-primary"
                aria-label="Next testimonial"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 