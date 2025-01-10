import QuizApp from "../app/components/QuizApp";
import ErrorBoundary from "../app/components/ErrorBoundary";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <div className="container mx-auto px-4 py-4 min-h-screen flex flex-col">
        <h1 className="text-4xl font-bold text-white text-center mb-4">
          Adaptive Quiz Generator
        </h1>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-4xl">
            <div className="bg-white/30 backdrop-blur-md rounded-3xl shadow-xl p-6 pb-4">
              <ErrorBoundary>
                <QuizApp />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
