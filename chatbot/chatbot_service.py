import os
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import numpy as np
from textblob import TextBlob
from dotenv import load_dotenv
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_groq import ChatGroq
from langchain_core.documents import Document

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmotionDetector:
    def __init__(self):
        self.emotion_keywords = {
            'depression': ['sad', 'hopeless', 'worthless', 'empty', 'tired'],
            'anxiety': ['worried', 'nervous', 'panic', 'fear', 'stress'],
            'anger': ['angry', 'frustrated', 'mad', 'irritated', 'rage'],
            'crisis': ['suicide', 'die', 'end', 'hurt', 'kill']
        }
        
    def detect_emotion(self, text: str) -> Tuple[str, float]:
        blob = TextBlob(text.lower())
        sentiment = blob.sentiment.polarity
        
        # Check for crisis keywords first
        if any(word in text.lower() for word in self.emotion_keywords['crisis']):
            return 'crisis', -1.0
            
        emotion_scores = {}
        for emotion, keywords in self.emotion_keywords.items():
            score = sum(1 for word in keywords if word in text.lower())
            emotion_scores[emotion] = score
            
        dominant_emotion = max(emotion_scores.items(), key=lambda x: x[1])[0]
        return dominant_emotion, sentiment

class ChatbotService:
    def __init__(self):
        load_dotenv()
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            persistent_directory = os.path.join(current_dir, "db", "chroma_db_with_metadata")
            
            # Ensure the directory exists
            os.makedirs(persistent_directory, exist_ok=True)
            
            # Initialize embeddings with error checking
            embeddings = HuggingFaceEmbeddings(
                model_name="sentence-transformers/all-mpnet-base-v2",
                cache_folder=os.path.join(current_dir, "models")
            )
            
            # Initialize vector store with error checking
            try:
                db = Chroma(
                    persist_directory=persistent_directory,
                    embedding_function=embeddings
                )
                # Test if the database is empty
                if db._collection.count() == 0:
                    logger.warning("Vector store is empty. Please ensure it's properly initialized with documents.")
            except Exception as e:
                logger.error(f"Error initializing Chroma: {str(e)}")
                raise
            
            self.retriever = db.as_retriever(
                search_type="similarity",
                search_kwargs={"k": 3},
            )
            
            # Verify GROQ API key
            if not os.getenv("GROQ_API_KEY"):
                raise ValueError("GROQ_API_KEY not found in environment variables")
            
            self.llm = ChatGroq(
                api_key=os.getenv("GROQ_API_KEY"),
                model="mixtral-8x7b-32768",
                temperature=0.7,  # Increased for more creative responses
                max_tokens=1000,  # Specify max tokens
                timeout=30,  # Set specific timeout
                max_retries=3,
            )
            
            # Initialize other components
            self.emotion_detector = EmotionDetector()
            self.coping_strategies = self._load_coping_strategies()
            self.crisis_resources = self._load_crisis_resources()
            self.mood_tracker = {}
            self.conversation_memory = []
            self.max_memory_length = 10
            self.relevance_threshold = 0.7
            
            # Initialize chains
            self._initialize_chains()
            
        except Exception as e:
            logger.error(f"Initialization error: {str(e)}")
            raise

    def _initialize_chains(self):
        contextualize_q_system_prompt = (
            "Given a chat history and the latest user question "
            "which might reference context in the chat history, "
            "formulate a standalone question which can be understood "
            "without the chat history. Do NOT answer the question, just "
            "reformulate it if needed and otherwise return it as is."
        )
        
        contextualize_q_prompt = ChatPromptTemplate.from_messages([
            ("system", contextualize_q_system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ])
        
        history_aware_retriever = create_history_aware_retriever(
            self.llm, self.retriever, contextualize_q_prompt
        )
        
        qa_system_prompt = (
            "You are a gentle and compassionate companion, devoted to supporting individuals navigating the depths of mental health challenges. "
            "Your presence is a sanctuary of understanding and empathy, where each interaction feels like a warm embrace. "
            "With grace and sensitivity, you guide those you assist by asking thoughtful, meaningful questions that invite them to share their innermost feelings and experiences. "
            "Create a nurturing space where they feel genuinely heard and cherished, tailoring your support with profound insight and care. "
            "Encourage them to reflect on cherished memories and personal triumphs, igniting a spark of hope and motivation within their hearts. "
            "When appropriate, weave in uplifting stories, inspiring examples, and positive affirmations that resonate deeply and elevate their spirit. "
            "In moments when the user seeks happiness or relief, engage them with delightful interactions such as sharing heartwarming jokes, playful pick-up lines, or inviting them to simple, joyful chat-based games like rock-paper-scissors to brighten their mood. "
            "Introduce something new in every chat—whether it's a different activity, a unique topic of conversation, a creative exercise, or a mindfulness prompt—to keep interactions vibrant and engaging. "
            "Incorporate gentle mindfulness or grounding techniques to help center their thoughts and alleviate stress. "
            "Share self-care tips and encourage healthy habits that promote well-being and resilience. "
            "If uncertainty arises about how to help, gently and warmly suggest seeking professional guidance, ensuring they feel supported every step of the way. "
            "Maintain your responses concise yet heartfelt, limited to three to four sentences, ensuring each exchange is a beautiful and meaningful connection. "
            "Avoid posing questions in every response; instead, let them flow naturally to enhance the support you provide, making each interaction truly marvelous."
            "\n\n"
            "Context: {context}"
        )
        
        qa_prompt = ChatPromptTemplate.from_messages([
            ("system", qa_system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}")
        ])
        
        question_answer_chain = create_stuff_documents_chain(self.llm, qa_prompt)
        self.rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)
    
    def _filter_relevant_documents(self, documents: List[Document]) -> List[Document]:
        """Filter documents based on relevance score."""
        return [doc for doc in documents if doc.metadata.get('score', 0) > self.relevance_threshold]
    
    def _preprocess_message(self, message: str) -> str:
        """Preprocess the input message."""
        return message.strip()
    
    def _postprocess_response(self, response: str) -> str:
        """Clean and format the response."""
        if not response:
            return "I apologize, but I'm unable to provide a meaningful response at this moment."
        return response.strip()
    
    def _update_memory(self, message: str, response: str):
        """Update conversation memory with latest interaction."""
        timestamp = datetime.now().isoformat()
        self.conversation_memory.append({
            'timestamp': timestamp,
            'message': message,
            'response': response
        })
        # Keep only recent conversations
        if len(self.conversation_memory) > self.max_memory_length:
            self.conversation_memory.pop(0)

    def _load_coping_strategies(self) -> Dict[str, List[str]]:
        return {
            'depression': [
                "Let's try a simple gratitude exercise. Can you share one small thing that brought you even a tiny moment of peace today?",
                "Remember, healing isn't linear. Your feelings are valid, and it's okay to take small steps.",
                "Would you like to try a quick 2-minute mindfulness exercise with me?"
            ],
            'anxiety': [
                "Let's practice a calming breathing technique together. Would you like to try that?",
                "Ground yourself by naming 5 things you can see right now.",
                "Remember, this moment of anxiety will pass. You've gotten through difficult moments before."
            ],
            'anger': [
                "Your feelings are valid. Let's find a healthy way to express them.",
                "Would you like to try a quick progressive muscle relaxation exercise?",
                "Sometimes writing our thoughts down can help process these intense emotions."
            ]
        }

    def _load_crisis_resources(self) -> Dict[str, str]:
        return {
            'global': "If you're in crisis, please reach out to these resources:\n" +
                     "- Crisis Helpline: 988 (US)\n" +
                     "- Emergency: 911 (US) / 112 (EU)\n" +
                     "- Crisis Text Line: Text HOME to 741741",
            'non_emergency': "Would you like me to provide information about mental health professionals in your area?"
        }

    def _customize_response(self, base_response: str, emotion: str, sentiment: float) -> str:
        if emotion == 'crisis':
            return f"{self.crisis_resources['global']}\n\n{base_response}"
            
        strategies = self.coping_strategies.get(emotion, [])
        if strategies and sentiment < -0.3:
            return f"{base_response}\n\n{np.random.choice(strategies)}"
            
        return base_response

    async def get_response(self, message: str, chat_history: List[Dict]) -> str:
        """Enhanced response generation with better error handling."""
        try:
            # Preprocess message
            processed_message = self._preprocess_message(message)
            logger.info(f"Processing message: {processed_message}")
            
            # Detect emotion
            emotion, sentiment = self.emotion_detector.detect_emotion(processed_message)
            logger.info(f"Detected emotion: {emotion}, sentiment: {sentiment}")
            
            # Format chat history
            formatted_history = [
                SystemMessage(content=msg["content"]) if msg["type"] == "system" else 
                HumanMessage(content=msg["content"]) 
                for msg in chat_history[-5:]
            ]
            
            # Get response with timeout handling
            try:
                result = await self.rag_chain.ainvoke({
                    "input": processed_message,
                    "chat_history": formatted_history
                })
                
                if not result or 'answer' not in result:
                    logger.error("Empty response from RAG chain")
                    return "I apologize, but I need a moment to gather my thoughts. Could you share more about what's on your mind?"
                
                # Customize and post-process response
                response = self._customize_response(
                    self._postprocess_response(result['answer']),
                    emotion,
                    sentiment
                )
                
                # Update memory and tracking
                self._update_memory(processed_message, response)
                if chat_history:
                    self._update_mood_tracking(chat_history[0]["content"], sentiment)
                
                return response
                
            except Exception as e:
                logger.error(f"RAG chain error: {str(e)}")
                return self._get_fallback_response(emotion)
                
        except Exception as e:
            logger.error(f"Response generation error: {str(e)}")
            return "I'm here to listen and support you. Could you tell me more about what you're experiencing?"

    def _get_fallback_response(self, emotion: str) -> str:
        """Provide meaningful fallback responses based on detected emotion."""
        fallback_responses = {
            'depression': "I hear that you're going through a difficult time. While I gather my thoughts, would you like to try a simple breathing exercise together?",
            'anxiety': "I understand you might be feeling anxious. Let's take a moment together - would you like to try a quick grounding exercise?",
            'anger': "I can sense that you're frustrated. Would you like to take a moment to explore what triggered these feelings?",
            'crisis': f"{self.crisis_resources['global']}\n\nYour well-being is important. Would you like to talk about what's troubling you?",
            'default': "I'm here to support you. Could you tell me more about what you're feeling right now?"
        }
        return fallback_responses.get(emotion, fallback_responses['default'])

    def _update_mood_tracking(self, user_id: str, sentiment: float):
        if user_id not in self.mood_tracker:
            self.mood_tracker[user_id] = []
        self.mood_tracker[user_id].append({
            'timestamp': datetime.now().isoformat(),
            'sentiment': sentiment
        })

    def get_mood_analysis(self, user_id: str) -> Optional[Dict]:
        if user_id not in self.mood_tracker:
            return None
            
        moods = self.mood_tracker[user_id]
        sentiments = [m['sentiment'] for m in moods]
        return {
            'current_mood': sentiments[-1],
            'mood_trend': 'improving' if len(sentiments) > 1 and sentiments[-1] > sentiments[0] else 'needs_support',
            'interaction_count': len(sentiments)
        }

    def get_conversation_summary(self) -> Optional[Dict]:
        """Get summary of recent conversations."""
        if not self.conversation_memory:
            return None
        
        return {
            'total_interactions': len(self.conversation_memory),
            'latest_interaction': self.conversation_memory[-1],
            'session_start': self.conversation_memory[0]['timestamp']
        }
