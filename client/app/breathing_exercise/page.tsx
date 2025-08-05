'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { breathingApi, EmotionalState, BreathingPattern, BreathingStep } from '@/lib/breathing-api';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer, 
  Area, 
  AreaChart,
  ReferenceLine
} from 'recharts';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartPulse, Clock, Activity, Info } from 'lucide-react';
import axios from 'axios';

export default function BreathingExercisePage() {
  // User input state
  const [description, setDescription] = useState<string>('');
  const [stressLevel, setStressLevel] = useState<number>(5);
  const [symptoms, setSymptoms] = useState<string>('');
  const [timeAvailable, setTimeAvailable] = useState<number>(5);
  
  // Exercise state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [exercise, setExercise] = useState<BreathingPattern | null>(null);
  const [isExerciseActive, setIsExerciseActive] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [breathingData, setBreathingData] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isFocalPointAnimated, setIsFocalPointAnimated] = useState<boolean>(false);
  
  // Timer ref to clear on unmount
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timerRef = useRef<any>(null);
  
  // Generate a breathing exercise
  const generateExercise = async () => {
    if (!description) {
      toast.error('Please describe how you feel');
      return;
    }
    
    const emotionalState: EmotionalState = {
      description,
      stress_level: stressLevel,
      time_available: timeAvailable
    };
    
    if (symptoms) {
      emotionalState.physical_symptoms = symptoms;
    }
    
    setIsLoading(true);
    try {
      console.log('Generating exercise with state:', emotionalState);
      const result = await breathingApi.generateExercise(emotionalState);
      console.log('Received exercise result:', result);
      
      if (!result || !result.steps || result.steps.length === 0) {
        console.error('Invalid exercise result:', result);
        toast.error('Error generating exercise, using fallback');
        const fallbackExercise = getLocalDefaultExercise();
        setExercise(fallbackExercise);
        generateBreathingData(fallbackExercise.steps);
        return;
      }

      // Validate the exercise structure
      const isValidExercise = validateExerciseStructure(result);
      if (!isValidExercise) {
        console.error('Invalid exercise structure:', result);
        toast.error('Error with exercise format, using fallback');
        const fallbackExercise = getLocalDefaultExercise();
        setExercise(fallbackExercise);
        generateBreathingData(fallbackExercise.steps);
        return;
      }
      
      // Ensure the exercise duration matches the available time
      const adjustedExercise = {
        ...result,
        duration_minutes: Math.min(result.duration_minutes, timeAvailable)
      };
      
      setExercise(adjustedExercise);
      generateBreathingData(adjustedExercise.steps);
      toast.success('Breathing exercise generated!');
    } catch (error) {
      console.error('Error generating exercise:', error);
      
      // Provide more detailed error feedback
      if (error instanceof Error) {
        if (error.message.includes('Network Error') || (axios.isAxiosError(error) && error.code === 'ERR_NETWORK')) {
          toast.error(
            <div className="space-y-2">
              <p className="font-bold">Network Error</p>
              <p>Could not connect to the breathing exercise server.</p>
              <p className="text-sm text-muted-foreground">Please check your internet connection and try again.</p>
            </div>
          );
        } else if (error.message.includes('timeout')) {
          toast.error('Request timed out: Please try again');
        } else if (error.message.includes('Missing required fields')) {
          toast.error(error.message);
        } else {
          toast.error(`Error: ${error.message}`);
        }
      } else {
        toast.error('Failed to generate exercise, using fallback');
      }
      
      // Local fallback if the API completely fails
      const fallbackExercise = getLocalDefaultExercise();
      setExercise(fallbackExercise);
      generateBreathingData(fallbackExercise.steps);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Validate exercise structure
  const validateExerciseStructure = (exercise: BreathingPattern): boolean => {
    if (!exercise.name || !exercise.description || !exercise.steps || !exercise.benefits || !exercise.suitable_for) {
      return false;
    }

    if (!Array.isArray(exercise.steps) || exercise.steps.length === 0) {
      return false;
    }

    const validActions = ['inhale', 'hold', 'exhale'] as const;
    return exercise.steps.every((step: BreathingStep) => 
      validActions.includes(step.action) &&
      typeof step.duration === 'number' &&
      step.duration >= 0 &&
      typeof step.instruction === 'string' &&
      step.instruction.length > 0
    );
  };
  
  // Local fallback exercise
  const getLocalDefaultExercise = (): BreathingPattern => {
    return {
      name: "Calm Relief",
      description: "A gentle, slow breathing exercise to reduce stress and alleviate headaches.",
      steps: [
        {
          action: "inhale",
          duration: 4,
          instruction: "Breathe in slowly through your nose, feeling the air fill your lungs"
        },
        {
          action: "hold",
          duration: 2,
          instruction: "Hold your breath, allowing your body to relax"
        },
        {
          action: "exhale",
          duration: 6,
          instruction: "Exhale slowly through your mouth, releasing tension and stress"
        },
        {
          action: "hold",
          duration: 2,
          instruction: "Hold before breathing in again, feeling calm and centered"
        }
      ],
      duration_minutes: 5,
      benefits: [
        "Reduces stress and anxiety",
        "Alleviates physical tension and headaches",
        "Promotes relaxation and calmness"
      ],
      suitable_for: [
        "People experiencing stress and anxiety",
        "Those who need a quick relaxation break",
        "Individuals prone to headaches and physical tension"
      ]
    };
  };
  
  // Generate data for breathing visualization
  const generateBreathingData = (steps: BreathingStep[]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any[] = [];
    
    // Create a data point for each second of the exercise
    const totalCycleDuration = steps.reduce((acc, step) => acc + Math.max(step.duration, 1), 0); 
    // Ensure all steps are included, even those with 0 duration (use at least 1s)
    const validSteps = steps.map(step => ({
      ...step,
      duration: Math.max(step.duration, 1) // Minimum 1 second duration for visualization
    }));
    
    if (validSteps.length === 0) return;
    
    const totalSeconds = Math.min(300, totalCycleDuration * 10); // Show at most 5 min of data
    
    // First, identify the sequence of steps (should be inhale -> hold -> exhale -> hold)
    // Make sure we correctly identify hold steps by their context
    const stepsWithContext = validSteps.map((step, index) => {
      if (step.action !== 'hold') return { ...step, holdType: null };
      
      // Find the previous step to determine hold type
      const prevIndex = index === 0 ? validSteps.length - 1 : index - 1;
      const prevStep = validSteps[prevIndex];
      
      const holdType = prevStep.action === 'inhale' ? 'after-inhale' : 'after-exhale';
      return { ...step, holdType, actionDisplay: `hold (${holdType})` };
    });
    
    console.log("Breathing pattern with context:", stepsWithContext);
    
    for (let i = 0; i < totalSeconds; i++) {
      // Find current step in the cycle
      const cyclePosition = i % totalCycleDuration;
      let currentSecond = 0;
      let currentStepIndex = 0;
      
      for (let j = 0; j < stepsWithContext.length; j++) {
        const step = stepsWithContext[j];
        if (cyclePosition >= currentSecond && cyclePosition < currentSecond + step.duration) {
          currentStepIndex = j;
          break;
        }
        currentSecond += step.duration;
      }
      
      const currentStep = stepsWithContext[currentStepIndex];
      const stepPosition = (cyclePosition - currentSecond) / currentStep.duration;
      
      // Assign a "breath level" based on the action
      let breathLevel = 0;
      
      if (currentStep.action === 'inhale') {
        // Gradually increase from 0.1 to 1.0
        breathLevel = 0.1 + stepPosition * 0.9;
      } else if (currentStep.action === 'hold') {
        // Different levels for different hold types
        if (currentStep.holdType === 'after-inhale') {
          // Hold at full breath (top of cycle)
          breathLevel = 1.0;
          // Add a more noticeable wave for visual interest
          const waveAmount = 0.05;
          breathLevel -= Math.sin(stepPosition * Math.PI * 4) * waveAmount;
        } else {
          // Hold at empty breath (bottom of cycle)
          breathLevel = 0.1;
          // Add a more noticeable wave for visual interest
          const waveAmount = 0.05;
          breathLevel += Math.sin(stepPosition * Math.PI * 4) * waveAmount;
        }
      } else if (currentStep.action === 'exhale') {
        // Gradually decrease from 1.0 to 0.1
        breathLevel = 1.0 - stepPosition * 0.9;
      }
      
      // Create a consistent data structure for all steps with appropriate action display text
      data.push({
        time: i,
        level: breathLevel,
        action: currentStep.action,
        holdType: currentStep.holdType || null,
        actionDisplay: currentStep.action === 'hold' 
          ? `hold (${currentStep.holdType || 'default'})` 
          : currentStep.action
      });
    }
    
    setBreathingData(data);
  };
  
  // Start the breathing exercise
  const startExercise = () => {
    if (!exercise) return;
    
    // Ensure we always start with the first step 
    setIsExerciseActive(true);
    setCurrentStepIndex(0);
    
    // Make sure to use the actual duration from the step
    const firstStepDuration = Math.max(exercise.steps[0].duration, 1);
    setSecondsRemaining(firstStepDuration);
    
    // Log the starting step for debugging
    console.log(`Starting exercise with step: ${exercise.steps[0].action}, duration: ${firstStepDuration}s`);
    
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Start the timer
    timerRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          // Move to the next step
          setCurrentStepIndex(currentIdx => {
            // Calculate next index, ensuring we follow the pattern
            const nextIdx = (currentIdx + 1) % exercise.steps.length;
            
            // Get the next step's duration (ensure minimum 1s)
            const nextDuration = Math.max(exercise.steps[nextIdx].duration, 1);
            
            // Update the remaining seconds for the next step
            setSecondsRemaining(nextDuration);
            
            // Log detailed step transition for debugging
            console.log(`===== STEP TRANSITION =====`);
            console.log(`From: Step ${currentIdx} (${exercise.steps[currentIdx].action})`);
            console.log(`To: Step ${nextIdx} (${exercise.steps[nextIdx].action})`);
            console.log(`Duration: ${nextDuration}s`);
            console.log(`Total steps in sequence: ${exercise.steps.length}`);
            console.log(`Sequence: ${exercise.steps.map((s: BreathingStep) => s.action).join(' -> ')}`);
            console.log(`==========================`);
            
            return nextIdx;
          });
          
          // Return the duration of the next step
          const nextStepIndex = (currentStepIndex + 1) % exercise.steps.length;
          return Math.max(exercise.steps[nextStepIndex].duration, 1);
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Stop the breathing exercise
  const stopExercise = () => {
    setIsExerciseActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  
  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  // Set animation state based on current action
  useEffect(() => {
    if (!isExerciseActive || !exercise) return;
    
    const currentStep = exercise.steps[currentStepIndex];
    setIsFocalPointAnimated(currentStep.action !== 'hold');
  }, [currentStepIndex, isExerciseActive, exercise]);
  
  // Get color for the current action
  const getActionColor = (action: string) => {
    switch (action) {
      case 'inhale':
        return 'rgb(34, 197, 94)'; // green-500
      case 'hold':
        return 'rgb(59, 130, 246)'; // blue-500 - more vibrant blue
      case 'exhale':
        return 'rgb(168, 85, 247)'; // purple-500
      default:
        return 'rgb(156, 163, 175)'; // gray-400
    }
  };
  
  // Get gradient colors for the area chart
  // const getGradientColors = (action: string) => {
  //   switch (action) {
  //     case 'inhale':
  //       return ['rgba(34, 197, 94, 0.1)', 'rgba(34, 197, 94, 0.8)'];
  //     case 'hold':
  //       return ['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.8)'];
  //     case 'exhale':
  //       return ['rgba(168, 85, 247, 0.1)', 'rgba(168, 85, 247, 0.8)'];
  //     default:
  //       return ['rgba(156, 163, 175, 0.1)', 'rgba(156, 163, 175, 0.6)'];
  //   }
  // };
  
  // Update the template click handler
  const handleTemplateClick = async (template: { title: string; emotion: string; level: number }) => {
    // Set state
    setDescription(template.emotion);
    setStressLevel(template.level);
    setTimeAvailable(5);
    
    // Generate exercise immediately
    const emotionalState = {
      description: template.emotion,
      stress_level: template.level,
      time_available: 5
    };
    
    // Call generateExercise immediately
    setIsLoading(true);
    try {
      console.log('Generating exercise from template:', emotionalState);
      const result = await breathingApi.generateExercise(emotionalState);
      console.log('Received template exercise result:', result);
      
      if (!result || !result.steps || result.steps.length === 0) {
        console.error('Invalid template exercise result:', result);
        toast.error('Error generating exercise from template');
        return;
      }

      // Validate the exercise structure
      const isValidExercise = validateExerciseStructure(result);
      if (!isValidExercise) {
        console.error('Invalid exercise structure:', result);
        toast.error('Error with exercise format, using fallback');
        const fallbackExercise = getLocalDefaultExercise();
        setExercise(fallbackExercise);
        generateBreathingData(fallbackExercise.steps);
        return;
      }
      
      setExercise(result);
      generateBreathingData(result.steps);
      toast.success(`Created ${template.title} exercise!`);
    } catch (error) {
      console.error('Error generating exercise from template:', error);
      toast.error('Failed to generate exercise from template');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4 space-y-8 max-w-7xl">
      <h1 className="text-3xl font-bold text-center mb-6">Personalized Breathing Exercises</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Form */}
        <AnimatePresence mode="wait">
          {!isExerciseActive && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="lg:col-span-1"
            >
              <Card className="h-full shadow-lg border-t-4 border-t-primary">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <HeartPulse className="h-5 w-5 text-primary" />
                    How are you feeling?
                  </CardTitle>
                  <CardDescription>
                    Tell us about your current state, and we&apos;ll recommend a personalized breathing exercise to help.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="description" className="text-sm font-medium">
                      Describe how you feel right now
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="e.g., 'I'm feeling anxious about my presentation' or 'I'm stressed and having trouble focusing'"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-24 resize-none focus:ring-2 focus:ring-primary/20"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="stress-level" className="text-sm font-medium">Stress Level</Label>
                      <span className="text-sm font-medium bg-primary/10 px-2 py-1 rounded-full">
                        {stressLevel}/10
                      </span>
                    </div>
                    <Slider
                      id="stress-level"
                      min={1}
                      max={10}
                      step={1}
                      value={[stressLevel]}
                      onValueChange={(value) => setStressLevel(value[0])}
                      disabled={isLoading}
                      className="py-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Calm</span>
                      <span>Moderate</span>
                      <span>Stressed</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="symptoms" className="text-sm font-medium">
                      Any physical symptoms? (optional)
                    </Label>
                    <Input
                      id="symptoms"
                      placeholder="e.g., 'Headache', 'Tight chest', 'Rapid heartbeat'"
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      disabled={isLoading}
                      className="focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="time" className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Time available (minutes)
                    </Label>
                    <Select 
                      disabled={isLoading}
                      value={timeAvailable.toString()} 
                      onValueChange={(value) => setTimeAvailable(parseInt(value))}
                    >
                      <SelectTrigger className="focus:ring-2 focus:ring-primary/20">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 minute</SelectItem>
                        <SelectItem value="2">2 minutes</SelectItem>
                        <SelectItem value="3">3 minutes</SelectItem>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={generateExercise} 
                    className="w-full relative overflow-hidden group"
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                        Generating...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Create Breathing Exercise
                      </span>
                    )}
                    <span className="absolute inset-0 bg-primary/10 w-0 group-hover:w-full transition-all duration-700 ease-in-out -z-10"></span>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Exercise Display */}
        <AnimatePresence mode="wait">
          {exercise && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className={isExerciseActive ? "lg:col-span-3" : "lg:col-span-2"}
            >
              <Card className="shadow-xl border-t-4 border-t-primary/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: getActionColor(exercise.steps[0].action) }}></span>
                    {exercise.name}
                  </CardTitle>
                  <CardDescription className="text-lg text-foreground/80">{exercise.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Top Section: Benefits and Steps */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Benefits and suitable for */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-base font-medium flex items-center gap-2 mb-3">
                          <Info className="h-4 w-4 text-primary" />
                          Benefits
                        </h3>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {exercise.benefits.map((benefit: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-xs mt-0.5">
                                ✓
                              </span>
                              <span className="text-sm text-muted-foreground">{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="text-base font-medium flex items-center gap-2 mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="text-primary" viewBox="0 0 16 16">
                            <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                            <path fillRule="evenodd" d="M5.216 14A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216z"/>
                            <path d="M4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>
                          </svg>
                          Suitable For
                        </h3>
                        <ul className="space-y-1.5">
                          {exercise.suitable_for.map((person: string, index: number) => (
                            <li key={index} className="text-sm text-muted-foreground border border-primary/10 rounded-full px-3 py-1 inline-block m-1">
                              {person}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    {/* Steps */}
                    <div>
                      <h3 className="text-base font-medium flex items-center gap-2 mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="text-primary" viewBox="0 0 16 16">
                          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z"/>
                        </svg>
                        Breathing Pattern Steps
                      </h3>
                      <div className="grid gap-2.5">
                        {exercise.steps.map((step: BreathingStep, index: number) => (
                          <motion.div 
                            key={index} 
                            className={`p-3 rounded-lg shadow-sm transition-all duration-300 ${
                              isExerciseActive && currentStepIndex === index 
                                ? 'bg-primary/10 border border-primary/30' 
                                : 'bg-card/80 border border-border/50'
                            }`}
                            animate={{
                              scale: isExerciseActive && currentStepIndex === index ? 1.02 : 1,
                              y: isExerciseActive && currentStepIndex === index ? -2 : 0
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full animate-pulse"
                                  style={{ 
                                    backgroundColor: getActionColor(step.action),
                                    animationPlayState: isExerciseActive && currentStepIndex === index ? 'running' : 'paused'
                                  }}
                                ></div>
                                <span className="font-medium capitalize">{step.action}</span>
                              </div>
                              <span className="text-sm bg-primary/5 px-2 py-0.5 rounded-full">{step.duration}s</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 ml-5">{step.instruction}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Breathing Pattern Visualization */}
                  <div className="mt-6">
                    <h3 className="text-base font-medium flex items-center gap-2 mb-3">
                      <Activity className="h-4 w-4 text-primary" />
                      Breathing Pattern Visualization
                    </h3>
                    <div className="h-[200px] w-full p-2 bg-background/50 rounded-lg shadow-inner">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={breathingData.slice(0, 60)}>
                          <defs>
                            {['inhale', 'hold', 'exhale'].map((action) => (
                              <linearGradient key={action} id={`gradient-${action}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={getActionColor(action)} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={getActionColor(action)} stopOpacity={0.1}/>
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis 
                            dataKey="time" 
                            label={{ value: 'Seconds', position: 'insideBottomRight', offset: -5 }}
                            tick={false}
                            stroke="#888888"
                          />
                          <YAxis 
                            domain={[0, 1]} 
                            tickFormatter={(value) => {
                              if (value === 0) return 'Exhale';
                              if (value === 1) return 'Inhale';
                              return '';
                            }}
                            stroke="#888888"
                          />
                          <Area
                            type="monotone"
                            dataKey="level"
                            stroke={getActionColor(exercise.steps[currentStepIndex]?.action || 'inhale')}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill={`url(#gradient-${exercise.steps[currentStepIndex]?.action || 'inhale'})`}
                          />
                          
                          {/* Add hold indicators */}
                          {breathingData.slice(0, 60).map((point, i) => 
                            point.action === 'hold' && i % 3 === 0 ? (
                              <ReferenceLine 
                                key={`hold-line-${i}`}
                                x={point.time} 
                                stroke={getActionColor('hold')}
                                strokeWidth={1.5}
                                strokeDasharray="3 3"
                                ifOverflow="extendDomain"
                              />
                            ) : null
                          )}
                          
                          {isExerciseActive && (
                            <ReferenceLine 
                              x={breathingData.findIndex(
                                d => d.action === exercise.steps[currentStepIndex].action
                              )} 
                              stroke="red" 
                              strokeWidth={2} 
                              strokeDasharray="5 5"
                            />
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Active Exercise Visualization - Improved Layout */}
                  <AnimatePresence mode="wait">
                    {isExerciseActive && exercise.steps.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="rounded-xl p-4 md:p-6 mt-4 bg-gradient-to-br from-primary/5 to-primary/20 backdrop-blur-sm shadow-lg"
                      >
                        {/* Compact layout with side-by-side design for larger screens */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                          {/* Left side: Animation */}
                          <div className="flex justify-center items-center order-2 md:order-1">
                            <motion.div 
                              className="relative flex items-center justify-center rounded-full"
                              style={{
                                borderWidth: 8,
                                borderColor: getActionColor(exercise.steps[currentStepIndex].action),
                                width: '200px',
                                height: '200px',
                              }}
                              initial={{ scale: exercise.steps[currentStepIndex].action === 'exhale' ? 1.2 : 1 }}
                              animate={{ 
                                scale: exercise.steps[currentStepIndex].action === 'inhale' 
                                  ? [1, 1.2] 
                                  : exercise.steps[currentStepIndex].action === 'exhale'
                                    ? [1.2, 1]
                                    : 1.2, // Fixed scale for hold
                                boxShadow: exercise.steps[currentStepIndex].action === 'hold' 
                                  ? ['0 0 0 rgba(0,0,0,0)', '0 0 40px rgba(59, 130, 246, 0.8)', '0 0 10px rgba(59, 130, 246, 0.4)']
                                  : '0 0 0 rgba(0,0,0,0)'
                              }}
                              transition={{
                                scale: { 
                                  duration: Math.max(exercise.steps[currentStepIndex].duration * 0.8, 1), // Scale duration relative to step duration
                                  ease: "easeInOut",
                                },
                                boxShadow: {
                                  duration: 2,
                                  repeat: exercise.steps[currentStepIndex].action === 'hold' ? Infinity : 0,
                                  repeatType: "mirror"
                                }
                              }}
                              key={`outer-circle-${currentStepIndex}-${exercise.steps[currentStepIndex].action}`}
                            >
                              <motion.div 
                                key={`inner-circle-${currentStepIndex}-${exercise.steps[currentStepIndex].action}`}
                                className="rounded-full"
                                style={{
                                  backgroundColor: getActionColor(exercise.steps[currentStepIndex].action),
                                  width: '60px',
                                  height: '60px',
                                }}
                                initial={{ 
                                  scale: exercise.steps[currentStepIndex].action === 'exhale' ? 1.5 : 0.8 
                                }}
                                animate={{
                                  scale: exercise.steps[currentStepIndex].action === 'inhale' 
                                    ? [0.8, 1.5] 
                                    : exercise.steps[currentStepIndex].action === 'exhale'
                                      ? [1.5, 0.8]
                                      : [1.3, 1.6, 1.3], // Pulsing for hold
                                  opacity: exercise.steps[currentStepIndex].action === 'hold' 
                                    ? [0.8, 1, 0.8] 
                                    : exercise.steps[currentStepIndex].action === 'inhale'
                                      ? [0.7, 1]
                                      : [1, 0.7]
                                }}
                                transition={{
                                  scale: {
                                    duration: Math.max(exercise.steps[currentStepIndex].duration * 0.8, 1),
                                    ease: "easeInOut",
                                    repeat: exercise.steps[currentStepIndex].action === 'hold' ? Infinity : 0,
                                    repeatType: "mirror"
                                  },
                                  opacity: {
                                    duration: Math.max(exercise.steps[currentStepIndex].duration * 0.8, 1),
                                    repeat: exercise.steps[currentStepIndex].action === 'hold' ? Infinity : 0,
                                    repeatType: "mirror"
                                  }
                                }}
                              ></motion.div>

                              <motion.div 
                                className="absolute rounded-full"
                                style={{
                                  backgroundColor: getActionColor(exercise.steps[currentStepIndex].action),
                                  opacity: 0.2,
                                  width: '160px',
                                  height: '160px',
                                }}
                                key={`middle-circle-${currentStepIndex}-${exercise.steps[currentStepIndex].action}`}
                                initial={{ 
                                  scale: exercise.steps[currentStepIndex].action === 'exhale' ? 1.1 : 0.9,
                                  opacity: exercise.steps[currentStepIndex].action === 'hold' ? 0.3 : 0.2
                                }}
                                animate={{
                                  scale: exercise.steps[currentStepIndex].action === 'inhale' 
                                    ? [0.9, 1.1] 
                                    : exercise.steps[currentStepIndex].action === 'exhale'
                                      ? [1.1, 0.9]
                                      : [1.0, 1.15, 1.0], // Subtle pulse for hold
                                  opacity: exercise.steps[currentStepIndex].action === 'hold' 
                                    ? [0.2, 0.5, 0.2] 
                                    : exercise.steps[currentStepIndex].action === 'inhale'
                                      ? [0.2, 0.3]
                                      : [0.3, 0.2]
                                }}
                                transition={{
                                  scale: {
                                    duration: Math.max(exercise.steps[currentStepIndex].duration * 0.8, 1),
                                    ease: "easeInOut",
                                    repeat: exercise.steps[currentStepIndex].action === 'hold' ? Infinity : 0,
                                    repeatType: "mirror"
                                  },
                                  opacity: {
                                    duration: Math.max(exercise.steps[currentStepIndex].duration * 0.8, 1),
                                    repeat: exercise.steps[currentStepIndex].action === 'hold' ? Infinity : 0,
                                    repeatType: "mirror"
                                  }
                                }}
                              ></motion.div>

                              {/* Hold animation effects with improved detection */}
                              {exercise.steps[currentStepIndex].action === 'hold' && (
                                <>
                                  {/* Multiple rings for hold state to make it more distinctive */}
                                  <motion.div 
                                    className="absolute rounded-full z-10"
                                    style={{
                                      border: `4px solid ${getActionColor('hold')}`,
                                      width: '140px',
                                      height: '140px',
                                    }}
                                    initial={{ opacity: 0.7, scale: 1 }}
                                    animate={{
                                      scale: [1, 1.2, 1],
                                      opacity: [0.7, 1, 0.7],
                                      borderColor: ['rgba(59, 130, 246, 0.7)', 'rgba(59, 130, 246, 1)', 'rgba(59, 130, 246, 0.7)']
                                    }}
                                    transition={{
                                      duration: 1.5,
                                      repeat: Infinity,
                                      repeatType: "mirror"
                                    }}
                                  ></motion.div>
                                  
                                  {/* Middle ring */}
                                  <motion.div 
                                    className="absolute rounded-full z-5"
                                    style={{
                                      border: `3px solid ${getActionColor('hold')}`,
                                      width: '170px',
                                      height: '170px',
                                    }}
                                    initial={{ opacity: 0.5, scale: 0.95 }}
                                    animate={{
                                      scale: [0.95, 1.15, 0.95],
                                      opacity: [0.5, 0.9, 0.5],
                                      borderColor: ['rgba(59, 130, 246, 0.5)', 'rgba(59, 130, 246, 0.9)', 'rgba(59, 130, 246, 0.5)']
                                    }}
                                    transition={{
                                      duration: 2,
                                      repeat: Infinity,
                                      repeatType: "mirror",
                                      delay: 0.3
                                    }}
                                  ></motion.div>
                                  
                                  {/* Outer ring for more visibility */}
                                  <motion.div 
                                    className="absolute rounded-full z-4"
                                    style={{
                                      border: `2px solid ${getActionColor('hold')}`,
                                      width: '190px',
                                      height: '190px',
                                    }}
                                    initial={{ opacity: 0.3, scale: 0.9 }}
                                    animate={{
                                      scale: [0.9, 1.1, 0.9],
                                      opacity: [0.3, 0.7, 0.3],
                                      borderColor: ['rgba(59, 130, 246, 0.3)', 'rgba(59, 130, 246, 0.7)', 'rgba(59, 130, 246, 0.3)']
                                    }}
                                    transition={{
                                      duration: 2.5,
                                      repeat: Infinity,
                                      repeatType: "mirror",
                                      delay: 0.6
                                    }}
                                  ></motion.div>
                                  
                                  {/* Text indicator for hold with improved visibility */}
                                  <motion.div
                                    className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center z-20"
                                    initial={{ opacity: 0 }}
                                    animate={{ 
                                      opacity: [0.9, 1, 0.9],
                                      scale: [0.95, 1.05, 0.95]
                                    }}
                                    transition={{
                                      duration: 1.5,
                                      repeat: Infinity,
                                      repeatType: "mirror"
                                    }}
                                  >
                                    <div className="bg-blue-600 text-white px-6 py-2 rounded-full text-lg font-bold uppercase tracking-wider shadow-xl">
                                      HOLD
                                    </div>
                                  </motion.div>
                                </>
                              )}
                            </motion.div>
                          </div>
                          
                          {/* Right side: Instructions and Timer */}
                          <div className="flex flex-col justify-center items-center md:items-start order-1 md:order-2">
                            <motion.div 
                              className="text-8xl md:text-9xl font-bold text-center md:text-left mb-4"
                              animate={{ 
                                scale: secondsRemaining <= 3 ? [1, 1.2, 1] : 1,
                                color: secondsRemaining <= 3 ? ['currentColor', getActionColor(exercise.steps[currentStepIndex].action), 'currentColor'] : 'currentColor'
                              }}
                              transition={{ duration: 0.5, repeat: secondsRemaining <= 3 ? Infinity : 0 }}
                            >
                              {secondsRemaining}
                            </motion.div>
                            
                            <motion.h3 
                              className="text-4xl font-bold capitalize mb-3 text-center md:text-left"
                              key={`action-${currentStepIndex}`}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ 
                                opacity: 1, 
                                y: 0,
                                color: getActionColor(exercise.steps[currentStepIndex].action)
                              }}
                              transition={{ duration: 0.3 }}
                            >
                              {exercise.steps[currentStepIndex].action}
                            </motion.h3>
                            
                            <motion.p 
                              className="text-xl text-foreground/80 text-center md:text-left"
                              key={`instruction-${currentStepIndex}`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.3, delay: 0.1 }}
                            >
                              {exercise.steps[currentStepIndex].instruction}
                            </motion.p>
                            
                            {/* Next step preview (optional) */}
                            {exercise.steps.length > 1 && (
                              <motion.div 
                                className="mt-4 p-3 bg-background/30 rounded-lg border border-primary/20 w-full"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.8 }}
                              >
                                <p className="text-sm font-medium">Next: <span className="capitalize">{exercise.steps[(currentStepIndex + 1) % exercise.steps.length].action}</span></p>
                              </motion.div>
                            )}
                          </div>
                        </div>
                        
                        {/* Control button - now positioned at bottom */}
                        <div className="flex justify-center mt-6">
                          <Button 
                            onClick={stopExercise} 
                            variant="destructive" 
                            size="lg"
                            className="px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-destructive/90 hover:-translate-y-1"
                          >
                            Stop Exercise
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Control Buttons for non-active state */}
                  {!isExerciseActive && (
                    <div className="flex justify-center gap-4 mt-6">
                      <Button 
                        onClick={startExercise} 
                        size="lg" 
                        className="px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/80 hover:-translate-y-1"
                      >
                        Start Exercise
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Quick Exercise Templates */}
      {!exercise && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Quick Start Templates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Calm Anxiety", description: "4-7-8 breathing technique", emotion: "I'm feeling anxious and worried", level: 7 },
              { title: "Boost Focus", description: "Box breathing for concentration", emotion: "I need to focus better", level: 4 },
              { title: "Reduce Stress", description: "Deep diaphragmatic breathing", emotion: "I'm feeling stressed and tense", level: 8 },
              { title: "Sleep Better", description: "Relaxing pre-sleep exercise", emotion: "I'm having trouble falling asleep", level: 5 }
            ].map((template, i) => (
              <Card 
                key={i} 
                className="cursor-pointer hover:shadow-md transition-all duration-300 hover:-translate-y-1 border-primary/20 hover:border-primary" 
                onClick={() => handleTemplateClick(template)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{template.title}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full border-primary/30 text-primary hover:bg-primary/10"
                  >
                    Use Template
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
