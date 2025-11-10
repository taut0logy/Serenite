"use client";

import { useState, useRef, useEffect } from "react";
import {
    Send,
    Mic,
    Camera,
    MenuIcon,
    X,
    Upload,
    Settings,
    Sparkles,
    Info,
    Calendar,
    BarChart,
    PlusCircle,
    MoonStar,
    SunMedium,
    AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { v4 as uuidv4 } from "uuid";
import axios from "@/lib/axios";

// Type definitions
interface EmotionData {
    emotion: string;
    score: number;
    insights?: {
        description: string;
    };
}

interface Message {
    role: string;
    content: string;
    name?: string;
}

interface AgentState {
    combined_emotion_profile?: {
        confidence: number;
        mixed_signals?: boolean;
    };
}

// Import Shadcn UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import custom components
import ChatMessage from "@/components/mental-health-assistant/chat-message";
import ThinkingProcess from "@/components/mental-health-assistant/thinking-process";
import EmotionJournal from "@/components/mental-health-assistant/emotion-journal";
import EmotionInsights from "@/components/mental-health-assistant/emotion-insights";
import FacialEmotionCapture from "@/components/mental-health-assistant/facial-emotion-capture";
import VoiceEmotionCapture from "@/components/mental-health-assistant/voice-emotion-capture";

export default function MentalHealthAssistant() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content:
                "Hello! I'm your mental health assistant. How can I help you today?",
        },
    ]);
    const [input, setInput] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [agentState, setAgentState] = useState<AgentState | null>(null);
    const [sidebarTab, setSidebarTab] = useState<string>("journal"); // 'journal', 'insights', 'settings', 'resources'
    const [faceEmotion, setFaceEmotion] = useState<EmotionData | null>(null);
    const [voiceEmotion, setVoiceEmotion] = useState<EmotionData | null>(null);
    const [includeFaceEmotion, setIncludeFaceEmotion] =
        useState<boolean>(false);
    const [includeVoiceEmotion, setIncludeVoiceEmotion] =
        useState<boolean>(false);
    const [isRecording] = useState<boolean>(false);
    const [recordingTime] = useState<number>(0);
    const [audioUploadMode, setAudioUploadMode] = useState<boolean>(false);
    const [showAgentReasoning, setShowAgentReasoning] = useState<boolean>(true);
    const [emotionConfidence, setEmotionConfidence] = useState<string | null>(
        null
    );
    const [mixedEmotionalSignals, setMixedEmotionalSignals] =
        useState<boolean>(false);
    const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [isFaceModalOpen, setIsFaceModalOpen] = useState<boolean>(false);
    const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { theme, setTheme } = useTheme();

    // Scroll to bottom when messages change - only scroll the chat area, not the page
    // Only scroll when new messages are added, not on initial load
    useEffect(() => {
        // Only auto-scroll if there are messages and it's not the initial welcome message
        if (messages.length > 1) {
            scrollToBottom();
        }
    }, [messages]);

    // Cleanup the recording timer on unmount
    useEffect(() => {
        const timerRef = recordingTimerRef;
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    // Initialize userId from localStorage or create a new one
    useEffect(() => {
        let storedUserId = localStorage.getItem(
            "mental_health_assistant_user_id"
        );
        if (!storedUserId) {
            storedUserId = uuidv4();
            localStorage.setItem(
                "mental_health_assistant_user_id",
                storedUserId
            );
        }
        setUserId(storedUserId);

        // Load chat history when component mounts
        const loadChatHistory = async () => {
            if (storedUserId) {
                try {
                    const response = await axios.get(
                        `/chat/history/${storedUserId}`
                    );
                    if (response.status === 200) {
                        const data = response.data;
                        if (data.messages && data.messages.length > 0) {
                            // Add default welcome message if it doesn't exist
                            const hasWelcomeMessage = data.messages.some(
                                (msg) =>
                                    msg.role === "assistant" &&
                                    msg.content.includes(
                                        "How can I help you today"
                                    )
                            );

                            if (!hasWelcomeMessage) {
                                data.messages.unshift({
                                    role: "assistant",
                                    content:
                                        "Hello! I'm your mental health assistant. How can I help you today?",
                                });
                            }

                            setMessages(data.messages);
                        }
                    }
                } catch (error) {
                    console.error("Error loading chat history:", error);
                }
            }
        };

        loadChatHistory();
    }, []);

    const scrollToBottom = () => {
        // Use setTimeout to ensure the DOM has updated after state changes
        setTimeout(() => {
            if (messagesEndRef.current) {
                // Get the scrollable container (the ScrollArea viewport)
                const scrollContainer = messagesEndRef.current.closest(
                    "[data-radix-scroll-area-viewport]"
                );

                if (scrollContainer) {
                    // Scroll the container to bottom
                    scrollContainer.scrollTo({
                        top: scrollContainer.scrollHeight,
                        behavior: "smooth",
                    });
                } else {
                    // Fallback to regular scrollIntoView but with more specific options
                    messagesEndRef.current.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                        inline: "nearest",
                    });
                }
            }
        }, 50);
    };

    const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
        e?.preventDefault();
        if (!input.trim() && !faceEmotion && !voiceEmotion) return;

        // Add user message to chat
        const userMessage = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);
        setIsSheetOpen(false); // Close sheet when sending message

        try {
            // Prepare request with emotions if available
            const requestBody = {
                message: input,
                agent_state: agentState,
                include_face_emotion:
                    includeFaceEmotion && faceEmotion !== null,
                face_emotion: includeFaceEmotion ? faceEmotion : null,
                include_voice_emotion:
                    includeVoiceEmotion && voiceEmotion !== null,
                voice_emotion: includeVoiceEmotion ? voiceEmotion : null,
                user_id: userId, // Include the user ID to maintain chat history
            };

            // Make API request
            const response = await axios.post("/chat", requestBody);

            const data = response.data;

            // Update agent state
            setAgentState(data.agent_state);

            // Extract emotion confidence and mixed signals information, if available
            if (data.agent_state && data.agent_state.combined_emotion_profile) {
                const profile = data.agent_state.combined_emotion_profile;
                setEmotionConfidence(profile.confidence);
                setMixedEmotionalSignals(profile.mixed_signals || false);
            }

            // Filter to only include assistant and function messages, since we already added the user message
            let formattedMessages = data.messages
                .filter(
                    (msg) => msg.role === "assistant" || msg.role === "function"
                )
                .map((msg) => ({
                    role: msg.role,
                    content: msg.content,
                    name: msg.name,
                }));

            // Deduplicate thinking process messages that might be similar
            const functionMessages = formattedMessages.filter(
                (msg) => msg.role === "function"
            );
            const assistantMessages = formattedMessages.filter(
                (msg) => msg.role === "assistant"
            );

            // Only keep the last function message of each type (by name)
            const dedupedFunctionMessages: Message[] = [];
            const seenFunctionNames = new Set();

            // Process function messages in reverse (newest first)
            for (let i = functionMessages.length - 1; i >= 0; i--) {
                const msg = functionMessages[i];
                if (!seenFunctionNames.has(msg.name)) {
                    dedupedFunctionMessages.unshift(msg); // Add to front to maintain order
                    seenFunctionNames.add(msg.name);
                }
            }

            // For assistant messages, only keep the last one if there are multiple
            const dedupedAssistantMessages =
                assistantMessages.length > 0
                    ? [assistantMessages[assistantMessages.length - 1]]
                    : [];

            // Combine deduped messages in the right order
            formattedMessages = [
                ...dedupedFunctionMessages,
                ...dedupedAssistantMessages,
            ];

            // Filter out function messages if user has disabled agent reasoning
            const messagesToAdd = showAgentReasoning
                ? formattedMessages
                : formattedMessages.filter((msg) => msg.role !== "function");

            setMessages((prev) => [...prev, ...messagesToAdd]);
        } catch (error) {
            console.error("Error:", error);
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content:
                        "Sorry, I encountered an error. Please try again later.",
                },
            ]);
        } finally {
            setInput("");
            setIsLoading(false);
            // Reset emotion data after sending
            if (includeFaceEmotion) setFaceEmotion(null);
            if (includeVoiceEmotion) setVoiceEmotion(null);
            setIncludeFaceEmotion(false);
            setIncludeVoiceEmotion(false);
            // Reset emotion analysis data
            setEmotionConfidence(null);
            setMixedEmotionalSignals(false);
            // Focus the input field
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    };

    const captureImage = async () => {
        // Open the facial emotion capture modal instead of file input
        setIsFaceModalOpen(true);
    };

    const handleFaceEmotionDetected = (emotionData) => {
        setFaceEmotion(emotionData);
        setIncludeFaceEmotion(true);

        // Notify user
        setMessages((prev) => [
            ...prev,
            {
                role: "system",
                content: `Detected facial emotion: ${
                    emotionData.emotion
                } (confidence: ${Math.round(emotionData.score)}%)`,
            },
        ]);

        // Add emotion to journal
        addEmotionToJournal(
            emotionData.emotion,
            emotionData.score,
            "Captured from camera facial expression",
            "face"
        );
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            setIsLoading(true);
            const response = await axios.post(
                "/emotion/detect-face-emotion",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            if (response.status !== 200) {
                throw new Error("Failed to detect emotion");
            }

            const data = response.data;
            setFaceEmotion(data);
            setIncludeFaceEmotion(true);

            // Notify user
            setMessages((prev) => [
                ...prev,
                {
                    role: "system",
                    content: `Detected facial emotion: ${
                        data.emotion
                    } (confidence: ${Math.round(data.score * 100)}%)`,
                },
            ]);

            // Add emotion to journal
            addEmotionToJournal(
                data.emotion,
                data.score,
                "Automatically detected from facial expression",
                "face"
            );
        } catch (error) {
            console.error("Error detecting emotion:", error);
            setMessages((prev) => [
                ...prev,
                {
                    role: "system",
                    content:
                        "Failed to detect facial emotion. Please try again.",
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleAudioUploadMode = () => {
        setAudioUploadMode(!audioUploadMode);
        if (!audioUploadMode) {
            // Switching to upload mode
            audioInputRef.current?.click();
        }
    };

    const handleAudioUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        analyzeUploadedVoice(file);
    };

    const analyzeUploadedVoice = async (file) => {
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            setIsLoading(true);
            setMessages((prev) => [
                ...prev,
                { role: "system", content: "Analyzing uploaded audio..." },
            ]);

            const response = await axios.post(
                "/emotion/analyze-voice",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            const data = response.data;
            setVoiceEmotion(data);
            setIncludeVoiceEmotion(true);

            // Update the message
            setMessages((prev) => [
                ...prev.slice(0, -1),
                {
                    role: "system",
                    content: `Detected voice emotion: ${
                        data.emotion
                    } (confidence: ${Math.round(data.score * 100)}%)`,
                },
            ]);

            // Add emotion to journal
            addEmotionToJournal(
                data.emotion,
                data.score,
                "Automatically detected from voice",
                "voice"
            );
        } catch (error) {
            console.error("Error analyzing voice:", error);
            setMessages((prev) => [
                ...prev.slice(0, -1),
                {
                    role: "system",
                    content:
                        "Failed to analyze voice recording. Please try again.",
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVoiceButton = () => {
        // Open the voice emotion capture modal
        setIsVoiceModalOpen(true);
    };

    const handleVoiceEmotionDetected = (emotionData: EmotionData) => {
        setVoiceEmotion(emotionData);
        setIncludeVoiceEmotion(true);

        // Notify user
        setMessages((prev) => [
            ...prev,
            {
                role: "system",
                content: `Detected voice emotion: ${
                    emotionData.emotion
                } (confidence: ${Math.round(emotionData.score * 100)}%)`,
            },
        ]);

        // Add emotion to journal
        addEmotionToJournal(
            emotionData.emotion,
            emotionData.score,
            "Detected from voice recording",
            "voice"
        );
    };

    const addEmotionToJournal = async (emotion, score, note, source) => {
        try {
            const entry = {
                emotion: emotion,
                score: score,
                note: note,
                source: source,
                timestamp: new Date().toISOString(),
            };

            await axios.post("/emotion-journal/add", entry);
            // No need to show feedback as this happens automatically
        } catch (error) {
            console.error("Error adding to emotion journal:", error);
        }
    };

    // Handle feedback submission
    const handleFeedbackSubmit = async (feedbackData) => {
        try {
            // Find the user message that preceded this assistant message
            const assistantMessageIndex = feedbackData.messageIndex;
            let userMessageContent = "";

            // Look for the closest user message before this assistant message
            for (let i = assistantMessageIndex - 1; i >= 0; i--) {
                if (messages[i].role === "user") {
                    userMessageContent = messages[i].content;
                    break;
                }
            }

            const feedbackPayload = {
                user_id: userId,
                timestamp: new Date().toISOString(),
                assistant_message: feedbackData.messageContent,
                user_message: userMessageContent,
                helpful: feedbackData.helpful,
                improvement: feedbackData.improvement,
                message_id: feedbackData.messageId,
            };

            // Submit the feedback to the server
            const response = await axios.post("/feedback", feedbackPayload);

            if (response.status !== 200) {
                throw new Error("Failed to submit feedback");
            }

            console.log("Feedback submitted successfully");
        } catch (error) {
            console.error("Error submitting feedback:", error);
        }
    };

    // Add this function to handle clearing the chat history
    const clearChatHistory = async () => {
        if (!userId) return;

        try {
            const response = await axios.delete(`/chat/history/${userId}`);

            if (response.status === 200) {
                // Reset messages to just the welcome message
                setMessages([
                    {
                        role: "assistant",
                        content:
                            "Hello! I'm your mental health assistant. How can I help you today?",
                    },
                ]);

                // Reset agent state
                setAgentState(null);

                // Clear emotions
                setFaceEmotion(null);
                setVoiceEmotion(null);
                setIncludeFaceEmotion(false);
                setIncludeVoiceEmotion(false);
                setEmotionConfidence(null);
                setMixedEmotionalSignals(false);
            }
        } catch (error) {
            console.error("Error clearing chat history:", error);
        }
    };

    // Add a function for uploading facial images directly
    const uploadFacialImage = () => {
        fileInputRef.current?.click();
    };

    // Helper to render the sidebar content
    const renderSidebarContent = () => {
        switch (sidebarTab) {
            case "journal":
                return <EmotionJournal />;
            case "insights":
                return <EmotionInsights />;
            case "settings":
                return (
                    <div className="p-5 space-y-6">
                        <div className="space-y-1.5">
                            <h3 className="text-lg font-semibold">
                                Assistant Settings
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Customize your experience
                            </p>
                        </div>

                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <label
                                        htmlFor="show-reasoning"
                                        className="text-sm font-medium"
                                    >
                                        Show Thinking Process
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        View how the assistant analyzes your
                                        messages
                                    </p>
                                </div>
                                <Switch
                                    id="show-reasoning"
                                    checked={showAgentReasoning}
                                    onCheckedChange={setShowAgentReasoning}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <label className="text-sm font-medium">
                                        Theme Settings
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        Choose light or dark mode
                                    </p>
                                </div>
                                <div className="flex space-x-1">
                                    <Button
                                        variant={
                                            theme === "light"
                                                ? "default"
                                                : "outline"
                                        }
                                        size="sm"
                                        className="h-8 px-2"
                                        onClick={() => setTheme("light")}
                                    >
                                        <SunMedium className="h-3.5 w-3.5 mr-1" />
                                        Light
                                    </Button>
                                    <Button
                                        variant={
                                            theme === "dark"
                                                ? "default"
                                                : "outline"
                                        }
                                        size="sm"
                                        className="h-8 px-2"
                                        onClick={() => setTheme("dark")}
                                    >
                                        <MoonStar className="h-3.5 w-3.5 mr-1" />
                                        Dark
                                    </Button>
                                </div>
                            </div>

                            <Separator />

                            {/* Admin section */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold">
                                    Admin Tools
                                </h4>
                                <div className="space-y-2">
                                    <Link href="/mental-health-assistant/feedback">
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start"
                                            size="sm"
                                        >
                                            <BarChart className="h-3.5 w-3.5 mr-2" />
                                            Feedback Dashboard
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            <Separator />

                            {/* Chat history section */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold">
                                    Chat History
                                </h4>
                                <div className="space-y-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        onClick={clearChatHistory}
                                    >
                                        <X className="h-3.5 w-3.5 mr-2" />
                                        Clear Chat History
                                    </Button>
                                    <p className="text-[10px] text-muted-foreground">
                                        This will delete all your conversation
                                        history with the assistant.
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold">About</h4>
                                <div className="bg-muted/50 rounded-lg p-3 text-xs leading-relaxed text-muted-foreground border border-muted/30">
                                    <p className="mb-2">
                                        This mental health assistant uses AI to
                                        provide support and information.
                                    </p>
                                    <p className="font-medium text-foreground/90">
                                        It is not a replacement for professional
                                        mental health services.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case "resources":
                return (
                    <div className="p-5 space-y-6">
                        <div className="space-y-1.5">
                            <h3 className="text-lg font-semibold">
                                Mental Health Resources
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Support services for mental wellbeing
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-lg border p-4 bg-card">
                                <h4 className="font-medium mb-2 flex items-center">
                                    <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                                    Crisis Support
                                </h4>
                                <div className="space-y-2">
                                    <div className="bg-muted/40 rounded p-2 text-sm">
                                        <p className="font-medium">
                                            National Mental Health Helpline
                                            (Bangladesh)
                                        </p>
                                        <p className="text-muted-foreground">
                                            01688-709965
                                        </p>
                                    </div>
                                    <div className="bg-muted/40 rounded p-2 text-sm">
                                        <p className="font-medium">
                                            Kaan Pete Roi (Emotional Support)
                                        </p>
                                        <p className="text-muted-foreground">
                                            9612119911
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Link
                                href="/mental-health-assistant/chat/resources"
                                className="block"
                            >
                                <Button className="w-full">
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                    View All Resources
                                </Button>
                            </Link>
                        </div>
                    </div>
                );
            default:
                return <EmotionJournal />;
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-65px)] bg-muted/30 dark:bg-gray-950">
            {/* Header */}
            <header className="bg-background border-b py-3 px-4 sm:px-6 sticky top-0 z-10 shadow-sm">
                <div className="flex justify-between items-center max-w-7xl mx-auto">
                    <div className="flex items-center space-x-4">
                        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full"
                                >
                                    <MenuIcon className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side="left"
                                className="w-[320px] sm:w-[380px] p-0 border-r"
                            >
                                <SheetHeader className="px-5 py-3 border-b flex flex-row justify-between items-center">
                                    <div className="flex items-center space-x-2">
                                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-md p-1">
                                            <Sparkles className="h-5 w-5 text-white" />
                                        </div>
                                        <SheetTitle>Wellness Tools</SheetTitle>
                                    </div>
                                </SheetHeader>

                                <Tabs
                                    defaultValue={sidebarTab}
                                    className="w-full"
                                    onValueChange={setSidebarTab}
                                >
                                    <div className="px-1 py-2 border-b">
                                        <TabsList className="w-full grid grid-cols-4 h-9">
                                            <TabsTrigger
                                                value="journal"
                                                className="text-xs"
                                            >
                                                <Calendar className="h-3.5 w-3.5 mr-1" />
                                                Journal
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="insights"
                                                className="text-xs"
                                            >
                                                <BarChart className="h-3.5 w-3.5 mr-1" />
                                                Insights
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="settings"
                                                className="text-xs"
                                            >
                                                <Settings className="h-3.5 w-3.5 mr-1" />
                                                Settings
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="resources"
                                                className="text-xs"
                                            >
                                                <Info className="h-3.5 w-3.5 mr-1" />
                                                Resources
                                            </TabsTrigger>
                                        </TabsList>
                                    </div>

                                    <ScrollArea className="flex-1 h-[calc(100vh-8rem)]">
                                        <TabsContent
                                            value={sidebarTab}
                                            className="mt-0"
                                        >
                                            {renderSidebarContent()}
                                        </TabsContent>
                                    </ScrollArea>
                                </Tabs>
                            </SheetContent>
                        </Sheet>

                        <div className="flex flex-col">
                            <h1 className="text-lg font-semibold tracking-tight">
                                Mental Health Assistant
                            </h1>
                            <p className="text-xs text-muted-foreground hidden sm:block">
                                AI-powered emotional support and guidance
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link href="/mental-health-assistant/resources">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="rounded-full h-9 w-9"
                                        >
                                            <Info className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Help & Resources
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            </header>

            {/* Main Chat Area */}
            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-[calc(100vh-12rem)] px-4 py-4">
                    <div className="max-w-3xl mx-auto space-y-3 pb-4">
                        {messages.map((message, index) => (
                            <div key={index}>
                                {message.role === "function" ? (
                                    <ThinkingProcess
                                        content={message.content}
                                    />
                                ) : (
                                    <ChatMessage
                                        message={message}
                                        messageIndex={index}
                                        onFeedbackSubmit={handleFeedbackSubmit}
                                    />
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />

                        {/* Loading indicators */}
                        {isLoading && !isRecording && (
                            <div className="flex justify-center my-4">
                                <div className="flex space-x-2">
                                    <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce"></div>
                                </div>
                            </div>
                        )}

                        {/* Recording indicator */}
                        {isRecording && (
                            <div className="flex justify-center items-center space-x-2 my-4">
                                <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></div>
                                <span className="text-sm font-medium">
                                    Recording... {recordingTime}s
                                </span>
                            </div>
                        )}

                        {/* Extra padding to ensure last message isn't cut off by input area */}
                        <div className="h-6" />
                    </div>
                </ScrollArea>
            </div>

            {/* Input Area */}
            <div className="border-t bg-background px-4 py-3 shadow-sm">
                <div className="max-w-3xl mx-auto">
                    {/* Emotion indicators */}
                    {(faceEmotion || voiceEmotion || emotionConfidence) && (
                        <div className="mb-3">
                            <div className="flex flex-wrap gap-2 mb-2">
                                {faceEmotion && (
                                    <div
                                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs border shadow-sm ${
                                            includeFaceEmotion
                                                ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/50 dark:border-blue-900/50 dark:text-blue-300"
                                                : "bg-muted/50 border-border"
                                        }`}
                                    >
                                        <input
                                            id="include-face"
                                            type="checkbox"
                                            checked={includeFaceEmotion}
                                            onChange={() =>
                                                setIncludeFaceEmotion(
                                                    !includeFaceEmotion
                                                )
                                            }
                                            className="h-3 w-3 mr-2 rounded-sm"
                                        />
                                        <label
                                            htmlFor="include-face"
                                            className="flex items-center cursor-pointer select-none"
                                        >
                                            <Camera className="h-3 w-3 mr-1.5" />
                                            <span className="font-medium mr-1">
                                                Face:
                                            </span>
                                            <span>{faceEmotion.emotion}</span>
                                            <Badge
                                                variant="outline"
                                                className="ml-1.5 py-0 h-4 text-[10px] px-1 font-normal"
                                            >
                                                {Math.round(
                                                    faceEmotion.score * 100
                                                )}
                                                %
                                            </Badge>
                                        </label>
                                    </div>
                                )}

                                {voiceEmotion && (
                                    <div
                                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs border shadow-sm ${
                                            includeVoiceEmotion
                                                ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/50 dark:border-green-900/50 dark:text-green-300"
                                                : "bg-muted/50 border-border"
                                        }`}
                                    >
                                        <input
                                            id="include-voice"
                                            type="checkbox"
                                            checked={includeVoiceEmotion}
                                            onChange={() =>
                                                setIncludeVoiceEmotion(
                                                    !includeVoiceEmotion
                                                )
                                            }
                                            className="h-3 w-3 mr-2 rounded-sm"
                                        />
                                        <label
                                            htmlFor="include-voice"
                                            className="flex items-center cursor-pointer select-none"
                                        >
                                            <Mic className="h-3 w-3 mr-1.5" />
                                            <span className="font-medium mr-1">
                                                Voice:
                                            </span>
                                            <span>{voiceEmotion.emotion}</span>
                                            <Badge
                                                variant="outline"
                                                className="ml-1.5 py-0 h-4 text-[10px] px-1 font-normal"
                                            >
                                                {Math.round(
                                                    voiceEmotion.score * 100
                                                )}
                                                %
                                            </Badge>
                                        </label>
                                    </div>
                                )}
                            </div>

                            {/* Confidence indicator */}
                            {emotionConfidence && (
                                <div
                                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ${
                                        emotionConfidence === "high"
                                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900/60"
                                            : emotionConfidence === "medium"
                                            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60"
                                            : "bg-muted/50 text-muted-foreground border-muted"
                                    } border shadow-sm`}
                                >
                                    <AlertCircle className="h-3 w-3 mr-1.5" />
                                    <span className="mr-1.5">
                                        {mixedEmotionalSignals
                                            ? "Mixed emotional signals detected"
                                            : "Emotion analysis:"}
                                    </span>
                                    <span className="font-medium">
                                        {emotionConfidence}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <div className="flex-1 relative">
                            <Input
                                ref={inputRef}
                                placeholder="Type your message..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={isLoading || isRecording}
                                className="pr-24 py-5 shadow-sm bg-background border-muted"
                            />

                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-1">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className={`h-8 w-8 rounded-full ${
                                                    includeFaceEmotion
                                                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                                                        : ""
                                                }`}
                                                onClick={captureImage}
                                                disabled={
                                                    isLoading || isRecording
                                                }
                                            >
                                                <Camera className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            Use camera for facial emotion
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-full"
                                                onClick={uploadFacialImage}
                                                disabled={
                                                    isLoading || isRecording
                                                }
                                            >
                                                <Upload className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            Upload facial image
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-full"
                                                onClick={toggleAudioUploadMode}
                                                disabled={
                                                    isLoading || isRecording
                                                }
                                            >
                                                <Upload className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            Upload audio
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                type="button"
                                                variant={
                                                    isRecording
                                                        ? "destructive"
                                                        : "ghost"
                                                }
                                                size="icon"
                                                className={`h-8 w-8 rounded-full ${
                                                    includeVoiceEmotion &&
                                                    !isRecording
                                                        ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
                                                        : ""
                                                }`}
                                                onClick={handleVoiceButton}
                                                disabled={
                                                    isLoading && !isRecording
                                                }
                                            >
                                                <Mic className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {isRecording
                                                ? "Stop recording"
                                                : "Record voice for emotion detection"}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            size="icon"
                            className="h-10 w-10 rounded-full shadow-sm"
                            disabled={
                                isLoading ||
                                isRecording ||
                                (!input.trim() && !faceEmotion && !voiceEmotion)
                            }
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>

                    <div className="mt-2 text-center">
                        <p className="text-[10px] text-muted-foreground">
                            Messages are private and will not be shared •{" "}
                            <Link
                                href="/privacy"
                                className="underline hover:text-foreground"
                            >
                                Privacy Policy
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* FacialEmotionCapture component */}
            <FacialEmotionCapture
                isOpen={isFaceModalOpen}
                onClose={() => setIsFaceModalOpen(false)}
                onEmotionDetected={handleFaceEmotionDetected}
            />

            {/* VoiceEmotionCapture component */}
            <VoiceEmotionCapture
                isOpen={isVoiceModalOpen}
                onClose={() => setIsVoiceModalOpen(false)}
                onEmotionDetected={handleVoiceEmotionDetected}
            />

            {/* Hidden file inputs */}
            <input
                title="Upload an image"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
            />
            <input
                title="Upload an audio file"
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleAudioUpload}
            />
        </div>
    );
}
