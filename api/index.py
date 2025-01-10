import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Set
import time
from educhain import Educhain, LLMConfig
from langchain_openai import ChatOpenAI
import random
from fastapi.middleware.cors import CORSMiddleware
load_dotenv()
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Templates
INITIAL_QUESTION_TEMPLATE: str = """
Generate a unique and high-quality multiple-choice question (MCQ) based on the given topic and level.
The question should be clear, relevant, and aligned with the topic. Provide four answer options and the correct answer.
Topic: {topic}
Learning Objective: {learning_objective}
Difficulty Level: {difficulty_level}
Guidelines:
1. Avoid repeating questions.
2. Ensure the question is specific and tests knowledge effectively.
3. Provide plausible distractors (incorrect options).
4. Include a brief explanation for the correct answer.
"""
ADAPTIVE_QUESTION_TEMPLATE: str = """
Based on the user's response to the previous question on {topic}, generate a new unique and high-quality multiple-choice question (MCQ).
If the user's response is correct, output a harder question. Otherwise, output an easier question.
The question should be clear, relevant, and aligned with the topic. Provide four answer options and the correct answer.
Previous Question: {previous_question}
User's Response: {user_response}
Was the response correct?: {response_correct}
Guidelines:
1. Avoid repeating questions.
2. Ensure the question is specific and tests knowledge effectively.
3. Provide plausible distractors (incorrect options).
4. Include a brief explanation for the correct answer.
"""
# Models
class Question(BaseModel):
    question: str
    options: List[str]
    answer: str
    explanation: Optional[str] = None
class UserResponse(BaseModel):
    user_answer: str
    previous_question: str
    response_correct: bool
    topic: str
# Add this class to define the request body structure
class TopicRequest(BaseModel):
    topic: str
# Initialize LLM Client
def get_llm(api_key: str) -> ChatOpenAI:
    """Initialize and cache the LLM client."""
    return ChatOpenAI(
        model="llama-3.1-70b-versatile",
        openai_api_base="https://api.groq.com/openai/v1",
        openai_api_key=api_key
    )
# Add this to check if the server is running
@app.get("/py/health")
async def health_check():
    return {"status": "ok"}

# Add at the top of the file
educhain_client = None

@app.on_event("startup")
async def startup_event():
    global educhain_client
    try:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable is not set")
        llm = get_llm(api_key)
        educhain_client = Educhain(LLMConfig(custom_model=llm))
    except Exception as e:
        print(f"Error initializing educhain client: {e}")
        raise e

# Add a session storage to track questions per user (in memory)
class QuizSession:
    def __init__(self):
        self.questions: List[str] = []
        self.current_difficulty: str = "Medium"

# Global quiz sessions storage
quiz_sessions: Dict[str, QuizSession] = {}

@app.post("/py/generate-initial-question")
def generate_initial_question(request: TopicRequest) -> Question:
    """Generate the first question for the quiz."""
    try:
        print(f"Received topic request: {request.topic}")
        
        result = educhain_client.qna_engine.generate_questions(
            topic=request.topic,
            num=1,
            learning_objective=f"Test knowledge of {request.topic}",
            difficulty_level="Medium",
            prompt_template="""
            Generate a multiple-choice question about {topic}.
            
            Requirements:
            1. Question should be clear and specific
            2. Provide exactly 4 answer options
            3. One correct answer
            4. Include a brief explanation
            5. Medium difficulty level
            6. Focus on fundamental concepts of {topic}
            
            Format:
            - Question: [your question]
            - Options: [four options]
            - Correct Answer: [the correct option]
            - Explanation: [brief explanation]
            """,
        )
        
        if not result or not result.questions:
            raise HTTPException(status_code=400, detail="Failed to generate question")
            
        question_data = result.questions[0]
        
        # Ensure we have exactly 4 options
        if len(question_data.options) != 4:
            raise HTTPException(status_code=400, detail="Invalid question format")
            
        response = Question(
            question=question_data.question,
            options=question_data.options,
            answer=question_data.answer,
            explanation=question_data.explanation,
        )
        
        print(f"Generated question: {response}")
        return response
            
    except Exception as e:
        print(f"Error generating question: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/py/generate-next-question")
def generate_next_question(user_response: UserResponse) -> Question:
    """Generate the next adaptive question based on user's performance."""
    try:
        print(f"Generating next question for topic: {user_response.topic}")
        
        difficulty = "harder" if user_response.response_correct else "easier"
        
        result = educhain_client.qna_engine.generate_questions(
            topic=user_response.topic,
            num=1,
            learning_objective=f"Test knowledge of {user_response.topic}",
            difficulty_level=difficulty,
            prompt_template=f"""
            Generate a {difficulty} multiple-choice question about {user_response.topic}.
            The previous question was: "{user_response.previous_question}"
            
            Requirements:
            1. Must be different from the previous question
            2. Provide exactly 4 answer options
            3. One correct answer
            4. Include a brief explanation
            5. {difficulty.capitalize()} difficulty than the previous question
            6. Focus on a different aspect of {user_response.topic}
            
            Format:
            - Question: [your question]
            - Options: [four options]
            - Correct Answer: [the correct option]
            - Explanation: [brief explanation]
            """,
        )

        if not result or not result.questions:
            raise HTTPException(status_code=400, detail="Failed to generate question")
            
        question_data = result.questions[0]
        
        # Ensure we have exactly 4 options
        if len(question_data.options) != 4:
            raise HTTPException(status_code=400, detail="Invalid question format")
            
        response = Question(
            question=question_data.question,
            options=question_data.options,
            answer=question_data.answer,
            explanation=question_data.explanation,
        )
        
        print(f"Generated next question: {response}")
        return response
            
    except Exception as e:
        print(f"Error generating next question: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))