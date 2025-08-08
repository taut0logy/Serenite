'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThumbsUp, ThumbsDown, BarChart, RefreshCw, Calendar } from 'lucide-react';
import axios from '@/lib/axios';

const FeedbackDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [rawFeedback, setRawFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [error, setError] = useState(null);

  const fetchFeedbackData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch analytics data
      const analyticsResponse = await axios.get('/feedback/analytics');
      setAnalytics(analyticsResponse.data);
      
      // Fetch raw feedback data
      const feedbackResponse = await axios.get('/feedback?limit=50');
      setRawFeedback(feedbackResponse.data.feedback || []);
    } catch (err) {
      console.error('Error fetching feedback data:', err);
      setError(err.message || 'Failed to fetch feedback data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbackData();
  }, []);

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateStr;
    }
  };

  const renderSummaryTab = () => {
    if (!analytics) return <p>No analytics data available.</p>;
    
    const { stats } = analytics;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground mt-1">Responses collected</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <ThumbsUp className="mr-2 h-5 w-5 text-green-500" />
              Helpful
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.helpful_percentage}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.helpful_count} responses marked helpful
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <ThumbsDown className="mr-2 h-5 w-5 text-red-500" />
              Needs Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {stats.unhelpful_percentage}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.unhelpful_count} responses needing improvement
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderThemesTab = () => {
    if (!analytics || !analytics.common_improvement_themes) {
      return <p>No improvement themes data available.</p>;
    }
    
    const { common_improvement_themes } = analytics;
    
    if (common_improvement_themes.length === 0) {
      return <p>No improvement themes have been identified yet.</p>;
    }
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Common Improvement Themes</CardTitle>
          <CardDescription>
            Themes identified from improvement suggestions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {common_improvement_themes.map((theme, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="font-medium capitalize">{theme.theme}</div>
                <div className="flex items-center">
                  <div className="w-32 bg-muted rounded-full h-2.5 mr-2">
                    <div 
                      className="bg-primary h-2.5 rounded-full" 
                      style={{ width: `${Math.min(100, (theme.count / common_improvement_themes[0].count) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-muted-foreground text-sm">{theme.count}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTrendsTab = () => {
    if (!analytics || !analytics.daily_stats) {
      return <p>No trend data available.</p>;
    }
    
    const { daily_stats } = analytics;
    
    if (daily_stats.length === 0) {
      return <p>No daily statistics have been recorded yet.</p>;
    }
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Feedback Trends</CardTitle>
          <CardDescription>
            Percentage of helpful responses over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {daily_stats.map((day, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{day.date}</span>
                  <span className="text-sm text-muted-foreground">
                    {day.helpful} of {day.total} helpful ({Math.round(day.helpful_percentage)}%)
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${day.helpful_percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderRawFeedbackTab = () => {
    if (!rawFeedback || rawFeedback.length === 0) {
      return <p>No raw feedback data available.</p>;
    }
    
    return (
      <div className="space-y-6">
        {rawFeedback.map((feedback, index) => (
          <Card key={index} className={feedback.helpful ? "border-l-green-500 border-l-4" : "border-l-red-500 border-l-4"}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base flex items-center">
                    {feedback.helpful ? (
                      <><ThumbsUp className="h-4 w-4 mr-2 text-green-500" /> Helpful</>
                    ) : (
                      <><ThumbsDown className="h-4 w-4 mr-2 text-red-500" /> Needs Improvement</>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {formatDate(feedback.timestamp)}
                  </CardDescription>
                </div>
                <div className="text-xs bg-muted px-2 py-1 rounded">
                  ID: {feedback.user_id?.slice(0, 8)}...
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <div className="text-sm font-medium">User Message:</div>
                <div className="bg-muted p-2 rounded text-sm mt-1">
                  {feedback.user_message || "No user message"}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium">Assistant Response:</div>
                <div className="bg-muted p-2 rounded text-sm mt-1">
                  {feedback.assistant_message || "No assistant message"}
                </div>
              </div>
              {!feedback.helpful && feedback.improvement && (
                <div>
                  <div className="text-sm font-medium">Improvement Suggestion:</div>
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 p-2 rounded text-sm mt-1 text-red-800 dark:text-red-300">
                    {feedback.improvement}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Feedback Dashboard</h2>
        <Button onClick={fetchFeedbackData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-4 rounded-md mb-6">
          Error: {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="summary">
              <BarChart className="h-4 w-4 mr-2" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="themes">
              <ThumbsDown className="h-4 w-4 mr-2" />
              Improvement Themes
            </TabsTrigger>
            <TabsTrigger value="trends">
              <Calendar className="h-4 w-4 mr-2" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="raw">
              Raw Feedback
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary">
            {renderSummaryTab()}
          </TabsContent>
          
          <TabsContent value="themes">
            {renderThemesTab()}
          </TabsContent>
          
          <TabsContent value="trends">
            {renderTrendsTab()}
          </TabsContent>
          
          <TabsContent value="raw">
            {renderRawFeedbackTab()}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default FeedbackDashboard; 