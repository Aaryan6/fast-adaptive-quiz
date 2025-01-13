"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { Question } from "./quiz-types";

interface QuizResults {
  total_questions: number;
  correct_answers: number;
  score: string;
  elapsed_time: number;
  details: {
    question: string;
    correct_answer: string;
    user_answer: string;
  }[];
}

export default function QuizApp() {
  const [topic, setTopic] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [quizResults, setQuizResults] = useState<QuizResults | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [questionHistory, setQuestionHistory] = useState<
    Array<{
      question: string;
      userAnswer: string;
      correctAnswer: string;
    }>
  >([]);
  const [elapsedTime, setElapsedTime] = useState(0);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const startQuiz = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/py/generate-initial-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error("Failed to generate question");
      }

      setCurrentQuestion(data);
      setSelectedAnswer(null);
      setScore(0);
      setQuestionsAnswered(0);
      setIsComplete(false);
      setQuizResults(null);
      setQuestionHistory([]);
      setStartTime(Date.now());
    } catch (error) {
      alert("Failed to start quiz. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSubmit = async (selectedOption: string) => {
    if (!currentQuestion || selectedAnswer) return;

    setSelectedAnswer(selectedOption);
    const isCorrect = selectedOption === currentQuestion.answer;
    if (isCorrect) {
      setScore(score + 1);
    }

    setQuestionHistory((prev) => [
      ...prev,
      {
        question: currentQuestion.question,
        userAnswer: selectedOption,
        correctAnswer: currentQuestion.answer,
      },
    ]);

    const nextQuestionNumber = questionsAnswered + 1;
    if (nextQuestionNumber >= 5) {
      setQuestionsAnswered(nextQuestionNumber);
      setIsComplete(true);
      calculateResults();
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/py/generate-next-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_answer: selectedOption,
          previous_question: currentQuestion.question,
          response_correct: isCorrect,
          topic,
        }),
      });

      const data = await response.json();
      console.log({ data });
      if (!response.ok) {
        throw new Error("Failed to get next question");
      }

      setQuestionsAnswered(nextQuestionNumber);
      setCurrentQuestion(data);
      setSelectedAnswer(null);
    } catch (error) {
      alert("Failed to get next question. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateResults = () => {
    if (!startTime) return;

    const elapsed_time = (Date.now() - startTime) / 1000;
    const total_questions = questionHistory.length;
    const correct_answers = questionHistory.filter(
      (q) => q.userAnswer === q.correctAnswer
    ).length;

    const results: QuizResults = {
      total_questions,
      correct_answers,
      score: `${correct_answers}/${total_questions}`,
      elapsed_time,
      details: questionHistory.map((q) => ({
        question: q.question,
        correct_answer: q.correctAnswer,
        user_answer: q.userAnswer,
      })),
    };

    setQuizResults(results);
  };

  useEffect(() => {
    if (isComplete) {
      calculateResults();
    }
  }, [isComplete]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (startTime && !isComplete) {
      intervalId = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [startTime, isComplete]);

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
          className="text-base bg-white/80 border-0"
          disabled={isLoading}
        />
        <Button
          type="submit"
          disabled={isLoading || !topic}
          className="bg-black hover:bg-black/90"
        >
          {isLoading ? "Loading..." : "Start Quiz"}
        </Button>
      </form>

      {currentQuestion && !isComplete && (
        <>
          <div className="flex justify-between items-center px-4">
            <div className="text-sm text-white font-medium">
              Score: {score}/5
            </div>
            <div className="text-sm text-white font-medium">
              Time: {formatTime(elapsedTime)}
            </div>
          </div>

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
                    selectedAnswer
                      ? option === currentQuestion.answer
                        ? "bg-green-100 border-green-500 border"
                        : selectedAnswer === option
                        ? "bg-red-100 border-red-500 border"
                        : "bg-gray-50 border border-gray-200"
                      : "hover:bg-gray-100 border border-gray-200"
                  }`}
                  disabled={!!selectedAnswer || isLoading}
                >
                  {option}
                </button>
              ))}
            </div>
          </Card>
        </>
      )}

      {isComplete && (
        <Card className="p-4">
          <h2 className="text-xl font-bold mb-3">Quiz Complete!</h2>
          {quizResults ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-lg mb-2">
                  Final Score: {quizResults.score} (
                  {Math.round(
                    (quizResults.correct_answers /
                      quizResults.total_questions) *
                      100
                  )}
                  %)
                </p>
                <p className="text-sm text-gray-600">
                  Time taken: {Math.round(quizResults.elapsed_time)} seconds
                </p>
              </div>

              <div className="space-y-4 mt-4">
                <h3 className="font-semibold">Question Details:</h3>
                {quizResults.details.map((detail, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <p className="font-medium">
                      Question {index + 1}: {detail.question}
                    </p>
                    <p
                      className={`text-sm ${
                        detail.user_answer === detail.correct_answer
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      Your answer: {detail.user_answer}
                    </p>
                    {detail.user_answer !== detail.correct_answer && (
                      <p className="text-sm text-green-600">
                        Correct answer: {detail.correct_answer}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <Button onClick={startQuiz} className="mt-4 w-full">
                Restart Quiz
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <p>Loading results...</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
