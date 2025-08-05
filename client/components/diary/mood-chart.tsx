'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

// Define the data structure needed for the chart
interface MoodData {
  date: Date;
  mood: string;
  confidence: number;
}

interface MoodChartProps {
  data?: MoodData[];
  fullSize?: boolean;
}

// Map mood strings to numeric values for chart visualization
const moodToValue = (mood: string): number => {
  const moodMap: Record<string, number> = {
    'Happy': 1.0,
    'Excited': 0.8,
    'Calm': 0.6,
    'Content': 0.5,
    'Neutral': 0.5,
    'Mixed': 0.0,
    'Tired': -0.3,
    'Anxious': -0.6,
    'Sad': -0.8,
    'Angry': -0.9,
    'Depressed': -1.0
  };
  
  // Default to neutral if mood not found in map
  // Convert to lowercase for case-insensitive matching
  const normalizedMood = mood.toLowerCase();
  for (const [key, value] of Object.entries(moodMap)) {
    if (normalizedMood.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return 0; // Default to neutral
};

export function MoodChart({ data = [], fullSize = false }: MoodChartProps) {
  // Validate dates and filter out invalid ones
  const validData = data.filter(item => 
    item.date instanceof Date && !isNaN(item.date.getTime())
  );

  // If no valid data is provided, use mock data
  const chartData = validData.length > 0 ? validData : [
    { date: new Date('2024-01-01'), mood: 'Neutral', confidence: 0.5 },
    { date: new Date('2024-01-02'), mood: 'Happy', confidence: 0.7 },
    { date: new Date('2024-01-03'), mood: 'Anxious', confidence: 0.4 },
    { date: new Date('2024-01-04'), mood: 'Excited', confidence: 0.8 },
    { date: new Date('2024-01-05'), mood: 'Calm', confidence: 0.6 },
  ];

  // Transform data for better visualization
  const normalizedData = chartData.map(item => {
    const moodValue = moodToValue(item.mood);
    
    // Ensure we have a valid date
    const dateObj = item.date instanceof Date && !isNaN(item.date.getTime()) 
      ? item.date 
      : new Date();
    
    return {
      date: dateObj,
      mood: item.mood,
      moodValue,
      confidence: item.confidence,
      // Normalize to 0-1 range for the chart
      normalizedMood: (moodValue + 1) / 2,
      // Format date safely
      formattedDate: format(dateObj, 'MMM dd')
    };
  });

  // Sort by date
  normalizedData.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Custom tooltip to show mood and confidence
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded p-2 shadow-sm">
          <p className="font-medium">{data.formattedDate}</p>
          <p>Mood: {data.mood}</p>
          <p>Confidence: {Math.round(data.confidence * 100)}%</p>
        </div>
      );
    }
    return null;
  };

  // Show a message if no data or all dates are invalid
  if (normalizedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No mood data available</p>
      </div>
    );
  }

  return (
    <div className={fullSize ? "h-full" : "h-[200px]"}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={normalizedData}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis 
            dataKey="formattedDate" 
            tick={{ fontSize: 12 }} 
          />
          <YAxis 
            domain={[0, 1]} 
            tickFormatter={(value) => {
              // Convert back to -1 to 1 scale for display
              const moodValue = (value * 2) - 1;
              if (moodValue > 0.7) return "Happy";
              if (moodValue > 0.3) return "Good";
              if (moodValue > -0.3) return "Neutral";
              if (moodValue > -0.7) return "Bad";
              return "Sad";
            }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            name="Mood"
            type="monotone"
            dataKey="normalizedMood"
            stroke="#8884d8"
            strokeWidth={2}
            dot={{ r: 4, fill: "#8884d8" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 