'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
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
    let timeCounter = 0;
    
    // Create a data point for each second of the exercise
    const totalCycleDuration = steps.reduce((acc, step) => acc + step.duration, 0);
    const totalSeconds = Math.min(300, totalCycleDuration * 10); // Show at most 5 min of data
    
    for (let i = 0; i < totalSeconds; i++) {
      // Find current step in the cycle
      const cyclePosition = i % totalCycleDuration;
      let currentSecond = 0;
      let currentStep = steps[0];
      
      for (const step of steps) {
        if (cyclePosition >= currentSecond && cyclePosition < currentSecond + step.duration) {
          currentStep = step;
          break;
        }
        currentSecond += step.duration;
      }
      
      // Assign a "breath level" based on the action
      let breathLevel = 0;
      
      if (currentStep.action === 'inhale') {
        // Calculate position within the inhale step
        const stepPosition = (cyclePosition - currentSecond) / currentStep.duration;
        breathLevel = 0.1 + stepPosition * 0.9; // Gradually increase from 0.1 to 1.0
      } else if (currentStep.action === 'hold') {
        breathLevel = 1.0; // Hold at full breath
      } else if (currentStep.action === 'exhale') {
        // Calculate position within the exhale step
        const stepPosition = (cyclePosition - currentSecond) / currentStep.duration;
        breathLevel = 1.0 - stepPosition * 0.9; // Gradually decrease from 1.0 to 0.1
      }
      
      data.push({
        time: i,
        level: breathLevel,
        action: currentStep.action
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
    <div className="container mx-auto p-4 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card className={`${isExerciseActive ? 'lg:hidden' : ''}`}>
          <CardHeader>
            <CardTitle>How are you feeling?</CardTitle>
            <CardDescription>
              Tell us about your current state, and we'll recommend a breathing exercise to help.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Describe how you feel right now</Label>
              <Textarea
                id="description"
                placeholder="e.g., 'I'm feeling anxious about my presentation' or 'I'm stressed and having trouble focusing'"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-24"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stress-level">Stress Level: {stressLevel}/10</Label>
              <Slider
                id="stress-level"
                min={1}
                max={10}
                step={1}
                value={[stressLevel]}
                onValueChange={(value) => setStressLevel(value[0])}
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="symptoms">Any physical symptoms? (optional)</Label>
              <Input
                id="symptoms"
                placeholder="e.g., 'Headache', 'Tight chest', 'Rapid heartbeat'"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="time">Time available (minutes)</Label>
              <Select 
                disabled={isLoading}
                value={timeAvailable.toString()} 
                onValueChange={(value) => setTimeAvailable(parseInt(value))}
              >
                <SelectTrigger>
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
            
            <Button 
              onClick={generateExercise} 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? 'Generating...' : 'Create Breathing Exercise'}
            </Button>
          </CardContent>
        </Card>
        
        {/* Exercise Display */}
        {exercise && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{exercise.name}</CardTitle>
              <CardDescription>{exercise.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Benefits */}
              <div>
                <h3 className="font-medium mb-2">Benefits</h3>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  {exercise.benefits.map((benefit, index) => (
                    <li key={index}>{benefit}</li>
                  ))}
                </ul>
              </div>
              
              {/* Instructions */}
              <div>
                <h3 className="font-medium mb-2">Steps</h3>
                <div className="grid gap-2">
                  {exercise.steps.map((step, index) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded-lg border ${
                        isExerciseActive && currentStepIndex === index 
                          ? 'bg-primary/10 border-primary' 
                          : 'bg-card border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getActionColor(step.action) }}
                          ></div>
                          <span className="font-medium capitalize">{step.action}</span>
                        </div>
                        <span className="text-sm">{step.duration} seconds</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{step.instruction}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Visualization */}
              <div className="mt-6">
                <h3 className="font-medium mb-2">Breathing Pattern</h3>
                <div className="h-[200px] w-full">
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
                      />
                      <YAxis 
                        domain={[0, 1]} 
                        tickFormatter={(value) => {
                          if (value === 0) return 'Exhale';
                          if (value === 1) return 'Inhale';
                          return '';
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="level"
                        stroke="#8884d8"
                        fillOpacity={1}
                        fill="url(#gradient-inhale)"
                      />
                      {isExerciseActive && (
                        <ReferenceLine 
                          x={breathingData.findIndex(
                            d => d.action === exercise.steps[currentStepIndex].action
                          )} 
                          stroke="red" 
                          strokeWidth={2} 
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Active Exercise Visualization */}
              {isExerciseActive && exercise.steps.length > 0 && (
                <div className="bg-black/5 dark:bg-white/5 rounded-lg p-6 mt-4">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold capitalize">
                      {exercise.steps[currentStepIndex].action}
                    </h3>
                    <p className="text-muted-foreground">
                      {exercise.steps[currentStepIndex].instruction}
                    </p>
                    <div className="text-3xl font-bold mt-2">
                      {secondsRemaining}
                    </div>
                  </div>
                  
                  {/* Animated breathing circle */}
                  <div className="flex justify-center items-center">
                    <div 
                      className={`relative flex items-center justify-center rounded-full border-4 
                        ${isFocalPointAnimated ? 'animate-pulse' : ''}
                      `}
                      style={{
                        borderColor: getActionColor(exercise.steps[currentStepIndex].action),
                        width: '200px',
                        height: '200px',
                        transition: 'all 1s ease-in-out',
                        transform: exercise.steps[currentStepIndex].action === 'inhale' 
                          ? 'scale(1.2)' 
                          : exercise.steps[currentStepIndex].action === 'exhale'
                            ? 'scale(0.8)'
                            : 'scale(1)',
                      }}
                    >
                      <div 
                        className="absolute rounded-full"
                        style={{
                          backgroundColor: getActionColor(exercise.steps[currentStepIndex].action),
                          opacity: 0.2,
                          width: '170px',
                          height: '170px',
                        }}
                      ></div>
                      <div 
                        className="rounded-full"
                        style={{
                          backgroundColor: getActionColor(exercise.steps[currentStepIndex].action),
                          width: '50px',
                          height: '50px',
                          transition: 'all 0.5s ease-in-out',
                          transform: exercise.steps[currentStepIndex].action === 'inhale' 
                            ? 'scale(1.5)' 
                            : exercise.steps[currentStepIndex].action === 'exhale'
                              ? 'scale(0.7)'
                              : 'scale(1)',
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Control Buttons */}
              <div className="flex justify-center gap-4 mt-4">
                {!isExerciseActive ? (
                  <Button onClick={startExercise} size="lg">
                    Start Exercise
                  </Button>
                ) : (
                  <Button onClick={stopExercise} variant="destructive" size="lg">
                    Stop Exercise
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
