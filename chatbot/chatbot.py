import os

from dotenv import load_dotenv
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_community.vectorstores import Chroma
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_groq import ChatGroq

# Load environment variables from .env
load_dotenv()

# Define the persistent directory
current_dir = os.path.dirname(os.path.abspath(__file__))
persistent_directory = os.path.join(current_dir, "db", "chroma_db_with_metadata")

# Define the embedding model
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")

# Load the existing vector store with the embedding function
db = Chroma(persist_directory=persistent_directory, embedding_function=embeddings)

# Create a retriever for querying the vector store
# `search_type` specifies the type of search (e.g., similarity)
# `search_kwargs` contains additional arguments for the search (e.g., number of results to return)
retriever = db.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 3},
)

# Create a ChatGroq model
llm = ChatGroq(
    model="mixtral-8x7b-32768",
    temperature=0,
    max_tokens=None,
    timeout=None,
    max_retries=2,
)

# Contextualize question prompt
# This system prompt helps the AI understand that it should reformulate the question
# based on the chat history to make it a standalone question
contextualize_q_system_prompt = (
    "Given a chat history and the latest user question "
    "which might reference context in the chat history, "
    "formulate a standalone question which can be understood "
    "without the chat history. Do NOT answer the question, just "
    "reformulate it if needed and otherwise return it as is."
)

# Create a prompt template for contextualizing questions
contextualize_q_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", contextualize_q_system_prompt),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ]
)

# Create a history-aware retriever
# This uses the LLM to help reformulate the question based on chat history
history_aware_retriever = create_history_aware_retriever(
    llm, retriever, contextualize_q_prompt
)

# Answer question prompt
# This system prompt helps the AI understand that it should provide concise answers
# based on the retrieved context and indicates what to do if the answer is unknown
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
    "{context}"
)







# Create a prompt template for answering questions
qa_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", qa_system_prompt),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ]
)

# Create a chain to combine documents for question answering
# `create_stuff_documents_chain` feeds all retrieved context into the LLM
question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)

# Create a retrieval chain that combines the history-aware retriever and the question answering chain
rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)


# Function to simulate a continual chat
def continual_chat():
    print("Start chatting with the AI! Type 'exit' to end the conversation.")
    
    # Initialize chat history with a welcome message from the AI
    welcome_message = "Hello! I'm here to support you. How can I assist you today?"
    chat_history = [
        SystemMessage(content=welcome_message)  # Pre-populated SystemMessage as welcome
    ]
    
    # Display the welcome message to the user
    print(f"AI: {welcome_message}")
    
    while True:
        query = input("You: ")
        if query.lower() == "exit":
            farewell_message = "Goodbye! Remember, seeking professional help is always a good step."
            print(f"AI: {farewell_message}")
            break
        # Process the user's query through the retrieval chain
        result = rag_chain.invoke({"input": query, "chat_history": chat_history})
        # Display the AI's response
        print(f"AI: {result['answer']}")
        # Update the chat history
        chat_history.append(HumanMessage(content=query))
        chat_history.append(SystemMessage(content=result["answer"]))


# Main function to start the continual chat
if __name__ == "__main__":
    continual_chat()
