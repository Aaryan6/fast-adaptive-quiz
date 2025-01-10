"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Question, UserResponse } from "./quiz-types";
import { motion, AnimatePresence } from "framer-motion";

export default function QuizApp() {
  const [topic, setTopic] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const startQuiz = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/py/generate-initial-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to generate question");
      }

      // Validate question format
      if (
        !data.question ||
        !data.options ||
        !Array.isArray(data.options) ||
        data.options.length !== 4
      ) {
        throw new Error("Invalid question format received");
      }

      setCurrentQuestion(data);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setScore(0);
      setQuestionsAnswered(0);
      setIsComplete(false);
    } catch (error) {
      console.error("Error starting quiz:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to start quiz. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSubmit = async (selectedOption: string) => {
    if (!currentQuestion || showExplanation) return;

    setSelectedAnswer(selectedOption);
    setShowExplanation(true);
    const isCorrect = selectedOption === currentQuestion.answer;

    if (isCorrect) {
      setScore(score + 1);
    }
    setQuestionsAnswered(questionsAnswered + 1);
  };

  const getNextQuestion = async () => {
    if (!currentQuestion || !selectedAnswer) return;

    try {
      setIsLoading(true);

      if (questionsAnswered >= 5) {
        setIsComplete(true);
        return;
      }

      const userResponse: UserResponse = {
        user_answer: selectedAnswer,
        previous_question: currentQuestion.question,
        response_correct: selectedAnswer === currentQuestion.answer,
        topic,
      };

      const response = await fetch("/api/py/generate-next-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userResponse),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to generate next question");
      }

      // Validate question format
      if (
        !data.question ||
        !data.options ||
        !Array.isArray(data.options) ||
        data.options.length !== 4
      ) {
        throw new Error("Invalid question format received");
      }

      setCurrentQuestion(data);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } catch (error) {
      console.error("Error getting next question:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to get next question. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          startQuiz();
        }}
        className="flex gap-2 justify-center"
      >
        <Input
          type="text"
          placeholder="Enter a topic..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="text-base bg-white/80 backdrop-blur-sm border-0"
          disabled={isLoading}
        />
        <Button
          type="submit"
          disabled={isLoading || !topic}
          size="default"
          className="bg-black hover:bg-black/90"
        >
          {isLoading ? "Generating..." : "Start Quiz"}
        </Button>
      </form>

      {questionsAnswered > 0 && !isComplete && (
        <div className="text-sm text-center text-white font-medium">
          Score: {score}/5 ({Math.round((score / 5) * 100)}%)
        </div>
      )}

      <AnimatePresence mode="wait">
        {currentQuestion && !isComplete && (
          <motion.div
            key={currentQuestion.question}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-4">
              <h2 className="text-xl font-semibold mb-3">
                Question {questionsAnswered + 1} of 5
              </h2>
              <p className="text-base mb-4">{currentQuestion.question}</p>
              <div className="space-y-2">
                {currentQuestion.options?.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSubmit(option)}
                    className={`w-full p-3 text-left rounded-lg transition-all ${
                      !showExplanation
                        ? "hover:bg-gray-100 border border-gray-200"
                        : option === currentQuestion.answer
                        ? "bg-green-100 border-green-500 border"
                        : selectedAnswer === option
                        ? "bg-red-100 border-red-500 border"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                    disabled={showExplanation || isLoading}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {showExplanation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4"
                  >
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h3 className="font-semibold mb-1">Explanation:</h3>
                      <p className="text-sm">{currentQuestion.explanation}</p>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button onClick={getNextQuestion} size="sm">
                        {questionsAnswered < 5
                          ? "Next Question"
                          : "Complete Quiz"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}

        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <Card className="p-4">
              <h2 className="text-xl font-bold mb-3">Quiz Complete!</h2>
              <p className="text-base mb-4">
                Your score: {score} out of {questionsAnswered} (
                {Math.round((score / questionsAnswered) * 100)}%)
              </p>
              <Button onClick={startQuiz} size="sm">
                Start New Quiz
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
