import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="py-24 bg-primary dark:bg-primary/90">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary-foreground">
          Ready to Start Your Journey?
        </h2>
        <p className="text-xl md:text-2xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
          Take the first step towards better mental health today. Our therapists are here to support you.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            size="lg"
            variant="secondary"
            className="text-lg px-8 bg-background hover:bg-background/90 text-foreground"
          >
            Get Started Today
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-lg px-8 border-background text-background hover:bg-background hover:text-primary transition-colors"
          >
            Learn More
          </Button>
        </div>
      </div>
    </section>
  );
} 