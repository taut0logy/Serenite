"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, CreditCard, HelpCircle, ChevronRight, Check, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentDetails {
  fullName: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  card: {
    cardholderName: string;
    cardNumber: string;
    expiryDate: string;
    cvv: string;
  };
  termsAccepted: boolean;
}

type PaymentStep = 'personal' | 'billing' | 'payment';

export default function PaymentPage() {
  const [currentStep, setCurrentStep] = useState<PaymentStep>('personal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<Partial<PaymentDetails>>({});
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const steps = [
    { id: 'personal', title: 'Personal Info' },
    { id: 'billing', title: 'Billing Address' },
    { id: 'payment', title: 'Payment' },
  ];

  const handleStepComplete = (step: PaymentStep) => {
    const nextSteps: Record<PaymentStep, PaymentStep> = {
      personal: 'billing',
      billing: 'payment',
      payment: 'payment',
    };
    setCurrentStep(nextSteps[step]);
  };

  const TermsAndConditions = () => (
    <Dialog open={showTerms} onOpenChange={setShowTerms}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-['Space_Grotesk']">
            <FileText className="w-6 h-6" />
            Terms and Conditions
          </DialogTitle>
          <DialogDescription>
            Please read these terms carefully before proceeding
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <section>
            <h3 className="font-semibold mb-2">1. Subscription Terms</h3>
            <p>By subscribing to our premium service, you agree to the following terms:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Your subscription will be automatically renewed unless cancelled</li>
              <li>You can cancel your subscription at any time through your account settings</li>
              <li>Refunds are processed according to our refund policy</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold mb-2">2. Privacy Policy</h3>
            <p>We take your privacy seriously. Your data will be:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Encrypted and stored securely</li>
              <li>Never shared with third parties without your consent</li>
              <li>Processed in accordance with GDPR regulations</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold mb-2">3. Payment Processing</h3>
            <p>All payments are processed securely through our payment provider:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Your card details are never stored on our servers</li>
              <li>All transactions are encrypted end-to-end</li>
              <li>We use industry-standard security measures</li>
            </ul>
          </section>
        </div>

        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={() => setShowTerms(false)}
          >
            Close
          </Button>
          <Button
            onClick={() => {
              setTermsAccepted(true);
              setShowTerms(false);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Accept Terms
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderTermsCheckbox = () => (
    <div className="flex items-center gap-2">
      <Checkbox 
        id="terms" 
        checked={termsAccepted}
        onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
      />
      <div className="flex items-center gap-1">
        <Label htmlFor="terms" className="text-sm">
          I agree to the
        </Label>
        <Button
          variant="link"
          className="h-auto p-0 text-sm text-blue-600 dark:text-blue-400"
          onClick={() => setShowTerms(true)}
        >
          Terms and Conditions
        </Button>
        <Label htmlFor="terms" className="text-sm">
          and
        </Label>
        <Button
          variant="link"
          className="h-auto p-0 text-sm text-blue-600 dark:text-blue-400"
          onClick={() => setShowTerms(true)}
        >
          Privacy Policy
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f4ff] to-[#f9fafb] dark:from-[#1e1b4b] dark:to-[#171923]">
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200",
                    currentStep === step.id
                      ? "bg-blue-600 text-white"
                      : steps.indexOf({ id: currentStep, title: '' }) > index
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                  )}>
                    {steps.indexOf({ id: currentStep, title: '' }) > index ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-24 h-1 mx-2 bg-gray-200 dark:bg-gray-700">
                      <div className={cn(
                        "h-full bg-blue-600 transition-all duration-300",
                        steps.indexOf({ id: currentStep, title: '' }) > index ? "w-full" : "w-0"
                      )} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {steps.map((step) => (
                <span key={step.id} className="text-sm text-muted-foreground">
                  {step.title}
                </span>
              ))}
            </div>
          </div>

          {/* Payment Form */}
          <Card className="backdrop-blur-sm bg-white/90 dark:bg-black/20 border-none shadow-lg">
            <CardHeader className="p-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold font-['Space_Grotesk']">
                  {steps.find(s => s.id === currentStep)?.title}
                </h1>
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <Lock className="w-4 h-4" />
                  <span>Secure Payment</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <AnimatePresence mode="wait">
                {currentStep === 'personal' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input id="fullName" placeholder="John Doe" />
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" placeholder="john@example.com" />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" placeholder="+1 (555) 000-0000" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentStep === 'billing' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="address1">Address Line 1</Label>
                        <Input id="address1" placeholder="123 Main St" />
                      </div>
                      <div>
                        <Label htmlFor="address2">Address Line 2 (Optional)</Label>
                        <Input id="address2" placeholder="Apt 4B" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city">City</Label>
                          <Input id="city" placeholder="New York" />
                        </div>
                        <div>
                          <Label htmlFor="state">State</Label>
                          <Input id="state" placeholder="NY" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="zip">ZIP Code</Label>
                          <Input id="zip" placeholder="10001" />
                        </div>
                        <div>
                          <Label htmlFor="country">Country</Label>
                          <Input id="country" placeholder="United States" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentStep === 'payment' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="cardName">Cardholder Name</Label>
                        <Input id="cardName" placeholder="John Doe" />
                      </div>
                      <div>
                        <Label htmlFor="cardNumber">Card Number</Label>
                        <div className="relative">
                          <Input id="cardNumber" placeholder="4242 4242 4242 4242" />
                          <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="expiry">Expiry Date</Label>
                          <Input id="expiry" placeholder="MM/YY" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor="cvv">CVV</Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="w-4 h-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>The 3 digits on the back of your card</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Input id="cvv" placeholder="123" />
                        </div>
                      </div>
                    </div>

                    {renderTermsCheckbox()}
                    <TermsAndConditions />
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>

            <CardFooter className="p-6 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between w-full">
                <Button
                  variant="outline"
                  onClick={() => {
                    const currentIndex = steps.findIndex(s => s.id === currentStep);
                    if (currentIndex > 0) {
                      setCurrentStep(steps[currentIndex - 1].id as PaymentStep);
                    }
                  }}
                  disabled={currentStep === 'personal'}
                >
                  Back
                </Button>
                <Button
                  onClick={() => handleStepComplete(currentStep)}
                  disabled={isProcessing}
                  className={cn(
                    "bg-blue-600 hover:bg-blue-700",
                    currentStep === 'payment' && "w-32"
                  )}
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{currentStep === 'payment' ? 'Pay Now' : 'Continue'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>

          {/* Security Badges */}
          <div className="mt-8 flex justify-center gap-6">
            <img src="/payment-badges/stripe.svg" alt="Powered by Stripe" className="h-8" />
            <img src="/payment-badges/visa.svg" alt="Visa" className="h-8" />
            <img src="/payment-badges/mastercard.svg" alt="Mastercard" className="h-8" />
          </div>
        </div>
      </div>
    </div>
  );
} 