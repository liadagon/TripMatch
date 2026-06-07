import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

const questions = [
  {
    icon: Globe2,
    text: "לאן את רוצה לטוס?",
    answers: ["דרום אמריקה", "תאילנד וויאטנם", "הודו", "אוסטרליה", "אירופה", "עוד לא החלטתי"],
  },
  {
    icon: CalendarDays,
    text: "מתי את מתכננת לצאת?",
    answers: ["בעוד חודש או חודשיים", "בעוד חצי שנה", "בתחילת הקיץ", "סוף הקיץ", "חורף", "גמיש לגמרי"],
  },
  {
    icon: Wallet,
    text: "מה התקציב שלך לטיול?",
    answers: ["חסכוני", "בינוני", "נוח", "גמיש, תלוי בחוויה"],
  },
  {
    icon: Backpack,
    text: "איזה סגנון טיול הכי מתאים לך?",
    answers: ["תרמילאות ואורח חיים מקומי", "טרקים והרפתקאות טבע", "סיורים תרבותיים וערים", "חוף ים ומנוחה", "שילוב של הכול"],
  },
  {
    icon: Map,
    text: "כמה חשוב לך לתכנן מראש?",
    answers: ["אני חייבת הכול מתוכנן", "אוהבת מסגרת בסיסית", "מינימום תכנון", "ממש ספונטנית"],
  },
  {
    icon: Hotel,
    text: "איזה סוג לינה מועדף עלייך?",
    answers: ["הוסטל", "Airbnb או דירה משותפת", "בית מלון סביר", "אוהל וקמפינג", "תלוי ביעד ובתקציב"],
  },
  {
    icon: Users,
    text: "את מחפשת שותף לכל הטיול או רק לחלק?",
    answers: ["לכל הטיול", "רק לחלק מהמסלול", "גמישה, נראה איך זה מסתדר"],
  },
  {
    icon: Sparkles,
    text: "מה הכי חשוב לך בשותף לטיול?",
    answers: ["תאימות לסגנון נסיעה", "אמינות ואחריות", "כימיה אישית טובה", "גמישות ורוח טובה", "כולם חשובים"],
  },
  {
    icon: TriangleAlert,
    text: "מה יכול להרוס לך טיול משותף?",
    answers: ["חוסר גמישות", "בזבזנות או קמצנות קיצונית", "חוסר כבוד לגבולות", "מריבות על החלטות קטנות", "לוח זמנים לא מסונכרן"],
  },
];

export default function Questionnaire() {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState(
    new Array(questions.length).fill(null)
  );

  const question = questions[currentQuestion];
  const Icon = question.icon;
  const isLastQuestion = currentQuestion === questions.length - 1;
  const hasSelectedAnswer = selectedAnswers[currentQuestion] !== null;
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  function selectAnswer(index) {
    const nextAnswers = [...selectedAnswers];
    nextAnswers[currentQuestion] = index;
    setSelectedAnswers(nextAnswers);
  }

  function goNext() {
    if (!hasSelectedAnswer) return;

    if (isLastQuestion) {
      navigate("/discover");
      return;
    }

    setCurrentQuestion((prev) => prev + 1);
  }

  function goBack() {
    if (currentQuestion === 0) return;
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
          <section className="questionnaire-card">
            <div className="questionnaire-icon">
              <Icon size={36} strokeWidth={2.4} />
            </div>

            <h1 className="questionnaire-question-text">{question.text}</h1>

            <div className="questionnaire-answers">
              {question.answers.map((answer, index) => (
                <button
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
          </section>
        </main>

        <div className="questionnaire-nav-row">
          {currentQuestion > 0 && (
            <button className="questionnaire-back-btn" onClick={goBack}>
              <span>אחורה</span>
              <span className="btn-arrow">→</span>
            </button>
          )}

          <button
            className={
              isLastQuestion
                ? "questionnaire-next-btn final active"
                : hasSelectedAnswer
                ? "questionnaire-next-btn active"
                : "questionnaire-next-btn"
            }
            onClick={goNext}
          >
            {isLastQuestion ? (
              <span>מצאי התאמות ✨</span>
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