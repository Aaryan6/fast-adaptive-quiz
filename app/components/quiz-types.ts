export interface Question {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
}

export interface UserResponse {
  user_answer: string;
  previous_question: string;
  response_correct: boolean;
  topic: string;
}

export interface QuizResult {
  total_questions: number;
  correct_answers: number;
  score: string;
  elapsed_time: number;
  details: QuizQuestionDetail[];
}

export interface QuizQuestionDetail {
  question: string;
  correct_answer: string;
  user_answer: string;
}
