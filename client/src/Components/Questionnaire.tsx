import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getPreviousOnboardingPath,
  getProfileCompletionPath,
} from "../utils/authNavigation";
import {
  Globe2,
  CalendarDays,
  Wallet,
  Backpack,
  Map,
  Hotel,
  Users,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import "./Questionnaire.css";
import { PROFILE_OPTIONS } from "../data/profileOptions";

const REQUIRED_FIELDS_MESSAGE =
  "לא כל השדות הנדרשים הושלמו. יש להשלים את השדות המסומנים.";

const questions = [
  {
    icon: Globe2,
    text: "לאן את רוצה לטוס?",
    answers: PROFILE_OPTIONS.destinations,
  },
  {
    icon: CalendarDays,
    text: "מתי את מתכננת לצאת?",
    answers: PROFILE_OPTIONS.tripDates,
  },
  {
    icon: CalendarDays,
    text: "כמה זמן תרצי לטייל?",
    answers: PROFILE_OPTIONS.tripDurations,
  },
  {
    icon: Wallet,
    text: "מה התקציב שלך לטיול?",
    answers: PROFILE_OPTIONS.budgets,
  },
  {
    icon: Backpack,
    text: "איזה סגנון טיול הכי מתאים לך?",
    answers: PROFILE_OPTIONS.travelStyles,
  },
  {
    icon: Map,
    text: "כמה חשוב לך לתכנן מראש?",
    answers: PROFILE_OPTIONS.planningStyles,
  },
  {
    icon: Hotel,
    text: "איזה סוג לינה מועדף עלייך?",
    answers: PROFILE_OPTIONS.accommodationPreferences,
  },
  {
    icon: Users,
    text: "את מחפשת שותף לכל הטיול או רק לחלק?",
    answers: PROFILE_OPTIONS.companionScopes,
  },
  {
    icon: Sparkles,
    text: "מה הכי חשוב לך בשותף לטיול?",
    answers: PROFILE_OPTIONS.companionPriorities,
  },
  {
    icon: TriangleAlert,
    text: "מה יכול להרוס לך טיול משותף?",
    answers: PROFILE_OPTIONS.dealBreakers,
  },
];

export default function Questionnaire() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Array<number | null>>(
    () => {
      const persistedAnswers = [
        user?.preferredDestinations?.[0],
        user?.tripDates,
        user?.tripDuration,
        user?.budget,
        user?.travelStyle,
        user?.questionnaire?.planningStyle,
        user?.questionnaire?.accommodationPreference,
        user?.questionnaire?.companionScope,
        user?.questionnaire?.companionPriority,
        user?.questionnaire?.dealBreaker,
      ];

      return questions.map((question, index) => {
        const answerIndex = (question.answers as readonly string[]).indexOf(
          persistedAnswers[index] || "",
        );
        return answerIndex >= 0 ? answerIndex : null;
      });
    },
  );
  const [saveError, setSaveError] = useState("");
  const [invalidQuestions, setInvalidQuestions] = useState<Set<number>>(
    () => new Set(),
  );
  const [isSaving, setIsSaving] = useState(false);

  const question = questions[currentQuestion];
  const Icon = question.icon;
  const isLastQuestion = currentQuestion === questions.length - 1;
  const hasSelectedAnswer = selectedAnswers[currentQuestion] !== null;
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  function selectAnswer(index: number) {
    const nextAnswers = [...selectedAnswers];
    nextAnswers[currentQuestion] = index;
    setSelectedAnswers(nextAnswers);
    setSaveError("");
    setInvalidQuestions((current) => {
      const next = new Set(current);
      next.delete(currentQuestion);
      return next;
    });
  }

  async function goNext() {
    if (isSaving) return;

    if (!hasSelectedAnswer) {
      setInvalidQuestions((current) => new Set(current).add(currentQuestion));
      setSaveError(REQUIRED_FIELDS_MESSAGE);
      return;
    }

    if (isLastQuestion) {
      const unansweredQuestions = selectedAnswers
        .map((answer, index) => (answer === null ? index : -1))
        .filter((index) => index >= 0);
      if (unansweredQuestions.length > 0) {
        setInvalidQuestions(new Set(unansweredQuestions));
        setSaveError(REQUIRED_FIELDS_MESSAGE);
        setCurrentQuestion(unansweredQuestions[0]);
        return;
      }

      const answers = selectedAnswers.map((answerIndex, questionIndex) =>
        answerIndex === null ? "" : questions[questionIndex].answers[answerIndex],
      );

      setIsSaving(true);
      setSaveError("");

      try {
        const updatedUser = await updateProfile({
          preferredDestinations: answers[0] ? [answers[0]] : [],
          tripDates: answers[1],
          tripDuration: answers[2],
          budget: answers[3],
          travelStyle: answers[4],
          questionnaire: {
            planningStyle: answers[5],
            accommodationPreference: answers[6],
            companionScope: answers[7],
            companionPriority: answers[8],
            dealBreaker: answers[9],
          },
        });
        navigate(getProfileCompletionPath(updatedUser), { replace: true });
      } catch {
        setSaveError("לא הצלחנו לשמור את השינויים. נסו שוב.");
      } finally {
        setIsSaving(false);
      }

      return;
    }

    setCurrentQuestion((prev) => prev + 1);
  }

  function goBack() {
    if (currentQuestion === 0) {
      navigate(getPreviousOnboardingPath("/questionnaire"), { replace: true });
      return;
    }
    setCurrentQuestion((prev) => prev - 1);
  }

  return (
    <div className="questionnaire-page" dir="rtl">
      <div className="questionnaire-shell">
        <header className="questionnaire-header">
          <div className="questionnaire-header-top">
            <div className="questionnaire-counter">
              שאלה {currentQuestion + 1} מתוך {questions.length}
            </div>

            <div className="questionnaire-logo">
              Trip<span>Match</span>
            </div>
          </div>

          <div className="questionnaire-progress-track">
            <div
              className="questionnaire-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </header>

        <main className="questionnaire-content">
          <section
            className={`questionnaire-card ${invalidQuestions.has(currentQuestion) ? "questionnaire-card-invalid" : ""}`}
          >
            <div className="questionnaire-icon">
              <Icon size={36} strokeWidth={2.4} />
            </div>

            <h1 className="questionnaire-question-text">{question.text}</h1>

            <div className="questionnaire-answers">
              {question.answers.map((answer, index) => (
                <button
                  type="button"
                  key={answer}
                  className={
                    selectedAnswers[currentQuestion] === index
                      ? "questionnaire-answer selected"
                      : "questionnaire-answer"
                  }
                  onClick={() => selectAnswer(index)}
                >
                  {answer}
                </button>
              ))}
            </div>
            {invalidQuestions.has(currentQuestion) && (
              <p className="questionnaire-field-error" role="alert">
                יש לבחור תשובה לפני שממשיכים.
              </p>
            )}
          </section>
        </main>

        {saveError && (
          <p className="questionnaire-save-error" role="alert">
            {saveError}
          </p>
        )}

        <div className="questionnaire-nav-row">
          <button
            type="button"
            className="questionnaire-back-btn"
            onClick={goBack}
          >
            <span>אחורה</span>
            <span className="btn-arrow">→</span>
          </button>

          <button
            type="button"
            className={
              isLastQuestion
                ? "questionnaire-next-btn final active"
                : hasSelectedAnswer
                ? "questionnaire-next-btn active"
                : "questionnaire-next-btn"
            }
            onClick={goNext}
            disabled={isSaving}
          >
            {isLastQuestion ? (
              <span>{isSaving ? "שומרת את התשובות..." : "מצאי התאמות ✨"}</span>
            ) : (
              <>
                <span>הבא</span>
                <span className="btn-arrow">←</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
