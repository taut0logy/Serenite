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
  LineChart, 
  Line, 
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
  const [breathingData, setBreathingData] = useState<any[]>([]);
  const [isFocalPointAnimated, setIsFocalPointAnimated] = useState<boolean>(false);
  
  // Timer ref to clear on unmount
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
      const result = await breathingApi.generateExercise(emotionalState);
      setExercise(result);
      toast.success('Breathing exercise generated!');
      
      // Generate visualization data from the breathing pattern
      generateBreathingData(result.steps);
    } catch (error) {
      console.error('Error generating exercise:', error);
      toast.error('Failed to generate exercise');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate data for breathing visualization
  const generateBreathingData = (steps: BreathingStep[]) => {
    const data: any[] = [];
    
    // Create a data point for each second of the exercise
    const totalCycleDuration = steps.reduce((acc, step) => acc + step.duration, 0);
    // Skip steps with duration 0
    const validSteps = steps.filter(step => step.duration > 0);
    if (validSteps.length === 0) return;
    
    const totalSeconds = Math.min(300, totalCycleDuration * 10); // Show at most 5 min of data
    
    // Map each step to include its type - whether it's a hold after inhale or hold after exhale
    const stepsWithContext = validSteps.map((step, index) => {
      if (step.action !== 'hold') return { ...step, holdType: null };
      
      // Find the previous step to determine hold type
      const prevIndex = index === 0 ? validSteps.length - 1 : index - 1;
      const prevStep = validSteps[prevIndex];
      
      const holdType = prevStep.action === 'inhale' ? 'after-inhale' : 'after-exhale';
      return { ...step, holdType };
    });
    
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
          // Add a very subtle wave for visual interest
          const waveAmount = 0.03;
          breathLevel -= Math.sin(stepPosition * Math.PI * 3) * waveAmount;
        } else {
          // Hold at empty breath (bottom of cycle)
          breathLevel = 0.1;
          // Add a very subtle wave for visual interest
          const waveAmount = 0.03;
          breathLevel += Math.sin(stepPosition * Math.PI * 3) * waveAmount;
        }
      } else if (currentStep.action === 'exhale') {
        // Gradually decrease from 1.0 to 0.1
        breathLevel = 1.0 - stepPosition * 0.9;
      }
      
      data.push({
        time: i,
        level: breathLevel,
        action: currentStep.action,
        holdType: currentStep.holdType || null
      });
    }
    
    setBreathingData(data);
  };
  
  // Start the breathing exercise
  const startExercise = () => {
    if (!exercise) return;
    
    setIsExerciseActive(true);
    setCurrentStepIndex(0);
    setSecondsRemaining(exercise.steps[0].duration);
    
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
            const nextIdx = (currentIdx + 1) % exercise.steps.length;
            setSecondsRemaining(exercise.steps[nextIdx].duration);
            return nextIdx;
          });
          return exercise.steps[(currentStepIndex + 1) % exercise.steps.length].duration;
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
        return 'rgb(59, 130, 246)'; // blue-500
      case 'exhale':
        return 'rgb(168, 85, 247)'; // purple-500
      default:
        return 'rgb(156, 163, 175)'; // gray-400
    }
  };
  
  // Get gradient colors for the area chart
  const getGradientColors = (action: string) => {
    switch (action) {
      case 'inhale':
        return ['rgba(34, 197, 94, 0.1)', 'rgba(34, 197, 94, 0.8)'];
      case 'hold':
        return ['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.8)'];
      case 'exhale':
        return ['rgba(168, 85, 247, 0.1)', 'rgba(168, 85, 247, 0.8)'];
      default:
        return ['rgba(156, 163, 175, 0.1)', 'rgba(156, 163, 175, 0.6)'];
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
                    Tell us about your current state, and we'll recommend a personalized breathing exercise to help.
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
                          {exercise.benefits.map((benefit, index) => (
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
                          {exercise.suitable_for.map((person, index) => (
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
                        {exercise.steps.map((step, index) => (
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
                  
                  {/* Active Exercise Visualization */}
                  <AnimatePresence mode="wait">
                    {isExerciseActive && exercise.steps.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="rounded-xl p-8 mt-4 bg-gradient-to-br from-primary/5 to-primary/20 backdrop-blur-sm shadow-lg"
                      >
                        <div className="text-center mb-8">
                          <motion.h3 
                            className="text-3xl font-bold capitalize mb-2"
                            key={`action-${currentStepIndex}`}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            {exercise.steps[currentStepIndex].action}
                          </motion.h3>
                          <motion.p 
                            className="text-muted-foreground text-lg"
                            key={`instruction-${currentStepIndex}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                          >
                            {exercise.steps[currentStepIndex].instruction}
                          </motion.p>
                          <motion.div 
                            className="text-5xl font-bold mt-4"
                            animate={{ 
                              scale: secondsRemaining <= 3 ? [1, 1.2, 1] : 1,
                              color: secondsRemaining <= 3 ? ['currentColor', getActionColor(exercise.steps[currentStepIndex].action), 'currentColor'] : 'currentColor'
                            }}
                            transition={{ duration: 0.5, repeat: secondsRemaining <= 3 ? Infinity : 0 }}
                          >
                            {secondsRemaining}
                          </motion.div>
                        </div>
                        
                        {/* Animated breathing circle */}
                        <div className="flex justify-center items-center">
                          <motion.div 
                            className="relative flex items-center justify-center rounded-full"
                            style={{
                              borderWidth: 8,
                              borderColor: getActionColor(exercise.steps[currentStepIndex].action),
                              width: '220px',
                              height: '220px',
                            }}
                            animate={{ 
                              scale: exercise.steps[currentStepIndex].action === 'inhale' 
                                ? [1, 1.2] 
                                : exercise.steps[currentStepIndex].action === 'exhale'
                                  ? [1.2, 1]
                                  : 1.2, // Keep a fixed scale for hold
                              boxShadow: exercise.steps[currentStepIndex].action === 'hold' 
                                ? ['0 0 0 rgba(0,0,0,0)', '0 0 15px rgba(59, 130, 246, 0.5)', '0 0 0 rgba(0,0,0,0)']
                                : '0 0 0 rgba(0,0,0,0)'
                            }}
                            transition={{
                              scale: { 
                                duration: exercise.steps[currentStepIndex].action === 'hold' 
                                  ? 0.1 // Quick transition for hold (almost immediate)
                                  : exercise.steps[currentStepIndex].duration,
                                ease: exercise.steps[currentStepIndex].action === 'hold'
                                  ? "easeOut"
                                  : "easeInOut",
                              },
                              boxShadow: {
                                duration: 2,
                                repeat: exercise.steps[currentStepIndex].action === 'hold' ? Infinity : 0,
                                repeatType: "reverse"
                              }
                            }}
                          >
                            <motion.div 
                              className="absolute rounded-full"
                              style={{
                                backgroundColor: getActionColor(exercise.steps[currentStepIndex].action),
                                opacity: 0.2,
                                width: '180px',
                                height: '180px',
                              }}
                              animate={{
                                scale: exercise.steps[currentStepIndex].action === 'inhale' 
                                  ? [0.9, 1.1] 
                                  : exercise.steps[currentStepIndex].action === 'exhale'
                                    ? [1.1, 0.9]
                                    : 1.1, // Fixed scale for hold
                                opacity: exercise.steps[currentStepIndex].action === 'hold' 
                                  ? [0.2, 0.4, 0.2] 
                                  : 0.2
                              }}
                              transition={{
                                scale: {
                                  duration: exercise.steps[currentStepIndex].action === 'hold'
                                    ? 0.1 // Quick transition for hold
                                    : exercise.steps[currentStepIndex].duration,
                                  ease: exercise.steps[currentStepIndex].action === 'hold'
                                    ? "easeOut"
                                    : "easeInOut",
                                },
                                opacity: {
                                  duration: 1.5,
                                  repeat: exercise.steps[currentStepIndex].action === 'hold' ? Infinity : 0,
                                  repeatType: "reverse"
                                }
                              }}
                            ></motion.div>
                            
                            <motion.div 
                              key={`inner-circle-${currentStepIndex}-${exercise.steps[currentStepIndex].action}`}
                              className="rounded-full"
                              style={{
                                backgroundColor: getActionColor(exercise.steps[currentStepIndex].action),
                                width: '60px',
                                height: '60px',
                              }}
                              animate={{
                                scale: exercise.steps[currentStepIndex].action === 'inhale' 
                                  ? [0.8, 1.5] 
                                  : exercise.steps[currentStepIndex].action === 'exhale'
                                    ? [1.5, 0.8]
                                    : 1.5, // Fixed scale for hold
                                opacity: exercise.steps[currentStepIndex].action === 'hold' 
                                  ? [0.8, 1, 0.8] 
                                  : 1
                              }}
                              transition={{
                                scale: {
                                  duration: exercise.steps[currentStepIndex].action === 'hold'
                                    ? 0.1 // Quick transition for hold
                                    : exercise.steps[currentStepIndex].duration,
                                  ease: exercise.steps[currentStepIndex].action === 'hold'
                                    ? "easeOut"
                                    : "easeInOut",
                                },
                                opacity: {
                                  duration: 1.2,
                                  repeat: exercise.steps[currentStepIndex].action === 'hold' ? Infinity : 0,
                                  repeatType: "reverse"
                                }
                              }}
                            ></motion.div>

                            {/* Special pulsing effect overlay for hold */}
                            {exercise.steps[currentStepIndex].action === 'hold' && (
                              <motion.div 
                                className="absolute rounded-full z-10"
                                style={{
                                  border: `2px solid ${getActionColor('hold')}`,
                                  width: '100px',
                                  height: '100px',
                                }}
                                animate={{
                                  scale: [1, 1.2, 1],
                                  opacity: [0.7, 0.3, 0.7]
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  repeatType: "reverse"
                                }}
                              ></motion.div>
                            )}
                          </motion.div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Control Buttons */}
                  <div className="flex justify-center gap-4 mt-6">
                    {!isExerciseActive ? (
                      <Button 
                        onClick={startExercise} 
                        size="lg" 
                        className="px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/80 hover:-translate-y-1"
                      >
                        Start Exercise
                      </Button>
                    ) : (
                      <Button 
                        onClick={stopExercise} 
                        variant="destructive" 
                        size="lg"
                        className="px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-destructive/90 hover:-translate-y-1"
                      >
                        Stop Exercise
                      </Button>
                    )}
                  </div>
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
                onClick={async () => {
                  setDescription(template.emotion);
                  setStressLevel(template.level);
                  setTimeAvailable(5);
                  
                  // Wait for state to update then generate exercise
                  setTimeout(async () => {
                    setIsLoading(true);
                    try {
                      const result = await breathingApi.generateExercise({
                        description: template.emotion,
                        stress_level: template.level,
                        time_available: 5
                      });
                      setExercise(result);
                      generateBreathingData(result.steps);
                      toast.success(`Created ${template.title} exercise!`);
                    } catch (error) {
                      console.error('Error generating exercise:', error);
                      toast.error('Failed to generate exercise');
                    } finally {
                      setIsLoading(false);
                    }
                  }, 100);
                }}
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
