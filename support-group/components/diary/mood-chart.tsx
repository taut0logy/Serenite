'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MoodTrend } from '@/lib/diary-api';

interface MoodChartProps {
  data?: MoodTrend[];
  fullSize?: boolean;
}

export function MoodChart({ data = [], fullSize = false }: MoodChartProps) {
  // If no data is provided, use mock data
  const chartData = data.length > 0 ? data : [
    { date: '2024-01-01', mood: 0.5, primary_emotion: 'content' },
    { date: '2024-01-02', mood: 0.7, primary_emotion: 'happy' },
    { date: '2024-01-03', mood: 0.4, primary_emotion: 'anxious' },
    { date: '2024-01-04', mood: 0.8, primary_emotion: 'excited' },
    { date: '2024-01-05', mood: 0.6, primary_emotion: 'calm' },
  ];

  // Transform negative sentiment to the 0-1 range for better visualization
  const normalizedData = chartData.map(item => ({
    ...item,
    // Convert mood from -1...1 to 0...1 for visualization
    normalizedMood: (item.mood + 1) / 2,
    // Format date
    formattedDate: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }));

  // Custom tooltip to show emotion and original mood value
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded p-2 shadow-sm">
          <p className="font-medium">{data.formattedDate}</p>
          <p>Mood: {data.mood.toFixed(2)}</p>
          <p>Emotion: {data.primary_emotion}</p>
        </div>
      );
    }
    return null;
  };

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
            tickFormatter={(value) => ((value * 2) - 1).toFixed(1)}
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