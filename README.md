# 🌐 Serenite: A Private & Intuitive Online Support Group System

Welcome to our **CSE 3200: System Project Laboratory Project**!

## Developed by

[**Md. Sakibur Rahman**](https://github.com/SakiburRahman07)

- Roll: 2007007
- Session: 2020-21

[**Raufun Ahsan**](https://github.com/taut0logy)

- Roll: 2007030
- Session: 2020-21

[*Department of Computer Science and Engineering, Khulna University of Engineering & Technology (KUET)*](https://www.kuet.ac.bd)

## 📖 Project Overview

The **Private & Intuitive Online Support Group System** is a comprehensive mental health platform that combines advanced technology with compassionate care. Our system provides secure support groups, AI-powered assistance, and personalized mental health tools to create a safe space for individuals seeking mental health support. 💙

## 🏆 Key Features

### 🔐 Advanced Authentication & Security

-   **Multi-layered Authentication**: NextAuth with JWT strategy, database sessions
-   **Two-Factor Authentication**: Enhanced security with device session tracking
-   **OAuth Integration**: Google, LinkedIn, and GitHub sign-in support
-   **KYC Verification**: Face matching against valid ID cards using Deepface
-   **Role-based Access Control**: Granular permissions and authorization

### 🧠 Intelligent Mental Health Assessment

-   **Comprehensive Questionnaire**: 7-domain clinical assessment covering:
    -   Depression (PHQ-9 style)
    -   Anxiety (GAD-7 style)
    -   PTSD symptoms (PCL-5 inspired)
    -   Social Anxiety (SIAS subset)
    -   Cognitive Distortions (CD-Quest short-form)
    -   Self-esteem (Rosenberg RSES)
    -   Sleep & Daily Functions (ISI + WHODAS subset)
-   **Smart Group Matching**: AI-powered support group recommendations
-   **Mental Health Profiling**: Personalized classification and insights

### 🎥 Secure Video Conferencing

-   **SFU-Based Streaming**: Powered by GetStream for optimal performance
-   **Network Optimized**: Robust performance even in poor network conditions
-   **Flexible Participation**: Join/leave sessions anytime with proper authorization
-   **Advanced Controls**: Selective participant muting and feed management
-   **Real-time Group Chat**: End-to-end encrypted messaging during sessions

### 🔒 End-to-End Encrypted Communication

-   **Real-time Messaging**: WebSocket and HTTP long polling support
-   **Military-Grade Encryption**: AES-GCM encryption with ECDH key exchange
-   **Group & Private Chat**: Secure communication channels
-   **Socket.IO Integration**: Seamless real-time event management

### 🤖 Personalized AI Assistant

-   **Advanced LLM**: Powered by llama3-70b-8192 for empathetic responses
-   **Agentic Framework**: LangGraph-powered AI that takes proactive actions
-   **Web Integration**: Tavily search for relevant articles and resources
-   **Continuous Learning**: Feedback-driven personalization
-   **Multimodal Input**: Voice-to-text and emotion detection from face/audio

### 📔 Intelligent Digital Diary

-   **Private & Encrypted**: Secure personal reflection space
-   **Vector Embeddings**: all-MiniLM-L6-v2 model for content analysis
-   **Knowledge Graph**: Visualize mental health patterns and progress
-   **Similarity Search**: Find connections in your emotional journey
-   **Progress Tracking**: Dashboard insights from diary entries

### 🌬️ Interactive Wellness Tools

-   **Guided Breathing Exercises**: Instant stress relief with preset techniques
-   **Visual Guidance**: Clear inhale/hold/exhale instructions
-   **Customizable Sessions**: "Calm" and "Focus" modes for different needs
-   **Immediate Access**: Always available for crisis moments

### 👥 Anonymous Community Platform

-   **Safe Sharing**: Anonymous posting and interaction
-   **Active Engagement**: Posts, comments, and reactions
-   **Moderated Environment**: Respectful and supportive community space
-   **Privacy First**: Complete anonymity protection

## 🛠️ Technology Stack

### Frontend

-   **Framework**: Next.js 15+ with TypeScript
-   **Styling**: Tailwind CSS + ShadCN/UI components
-   **Animations**: Framer Motion for smooth interactions
-   **State Management**: Zustand for client state
-   **GraphQL Client**: Apollo Client for data fetching

### Backend

-   **API Layer**: Next.js API Routes + FastAPI (Python)
-   **Security**: API rate limiting, CORS, encrypted HTTPS cookies
-   **Real-time**: Socket.IO for WebSocket/HTTP long polling
-   **GraphQL**: Yoga GraphQL Server for unified API

### Database & Storage

-   **Primary Database**: PostgreSQL with Prisma ORM
-   **Vector Storage**: Astra DB for embeddings and knowledge graphs
-   **Session Management**: Database-backed session control
-   **Data Security**: Encrypted storage with secure key management

### AI & Machine Learning

-   **Language Models**:
    -   llama3-70b-8192 (Conversational AI)
    -   all-MiniLM-L6-v2 (Vector embeddings)
    -   Deepface VGG-Face (Facial recognition for KYC)
-   **AI Framework**: LangChain for RAG pipelines, LangGraph for agentic workflows
-   **Search Integration**: Tavily for web search capabilities

### Video & Real-time Communication

-   **Video Conferencing**: GetStream SFU for scalable video streaming
-   **Real-time Events**: Socket.IO with fallback support
-   **Media Processing**: WebRTC integration for peer-to-peer communication

### Authentication & Security

-   **Auth System**: NextAuth with JWT strategy
-   **OAuth Providers**: Google, LinkedIn, GitHub integration
-   **Biometric Verification**: Deepface for KYC face matching
-   **Encryption**: AES-GCM for end-to-end encryption

## 🚀 Getting Started

### Prerequisites

-   Node.js 20+
-   PostgreSQL database
-   Python 3.10+ (for FastAPI services)
-   Astra DB account (for vector storage)

### Installation

1. **Clone the repository**

    ```bash
    git clone https://github.com/SakiburRahman07/Private-Intuitive-Online-Support-Group-System.git
    cd Private-Intuitive-Online-Support-Group-System
    ```

2. **Install dependencies**

    ```bash
    # Client dependencies
    cd client
    npm install

    # Server dependencies
    cd ../agents
    pip install -r requirements.txt
    ```

3. **Environment Setup**

    ```bash
    # Copy environment files
    cp .env.example .env.local

    # Configure your environment variables:
    # - Database URLs
    # - Authentication secrets
    # - API keys for AI services
    # - GetStream credentials
    ```

4. **Database Setup**

    ```bash
    cd client
    npx prisma generate
    npx prisma db push
    ```

5. **Start Development Servers**

    ```bash
    # Start Next.js client
    cd client
    npm run dev

    # Start FastAPI server (in another terminal)
    cd agents
    python app.py
    ```

## 🏗️ Architecture

Our system follows a microservices architecture with:

-   **Frontend**: Next.js application with server-side rendering
-   **Backend Services**: Next.js API + FastAPI for specialized AI operations
-   **Real-time Layer**: Socket.IO for live communication
-   **Data Layer**: PostgreSQL + Astra DB for hybrid storage
-   **AI Layer**: LangChain/LangGraph for intelligent assistance

## 🔒 Security Features

-   End-to-end encryption for all communications
-   Biometric verification for user identity
-   Role-based access control
-   Secure session management
-   GDPR-compliant data handling
-   Regular security audits and updates

## 📊 Mental Health Approach

Our platform is built on evidence-based psychological assessments and interventions:

-   Clinically validated questionnaires
-   Professional mental health frameworks
-   Privacy-first design principles
-   Trauma-informed care practices

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

🌟 **Together, let's make mental health support accessible, secure, and effective for everyone!** 🌟
