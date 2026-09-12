import { useState } from 'react';
import { InstallButton } from './InstallButton';
import confetti from 'canvas-confetti';

// --- LEVELS & ACHIEVEMENTS CONFIGURATION ---
const LEVELS = [
  { id: 1, name: 'Level 1: Multiply by 1, 2, 5, 10', factors: [1, 2, 5, 10], minScoreToUnlock: 0 },
  { id: 2, name: 'Level 2: Multiply by 3 and 4', factors: [1, 2, 3, 4, 5, 10], minScoreToUnlock: 5 },
  { id: 3, name: 'Level 3: Hard (6, 7, 8, 9)', factors: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], minScoreToUnlock: 12 },
];

const ACHIEVEMENTS_LIST = [
  { id: 'first_win', name: 'First Steps', desc: 'Solve your first problem', icon: '🌱' },
  { id: 'streak_5', name: 'On Fire', desc: '5 correct answers in a row', icon: '🔥' },
  { id: 'streak_10', name: 'Unstoppable!', desc: '10 correct answers in a row', icon: '⚡' },
  { id: 'master_5', name: 'Fives Master', desc: 'Solve 5 problems with 5 as a factor', icon: '🖐️' },
  { id: 'level_2_unlocked', name: 'Adept', desc: 'Unlock Level 2', icon: '⭐' },
  { id: 'level_3_unlocked', name: 'Math Master', desc: 'Unlock Level 3', icon: '👑' },
];

export default function MathGame() {
  // Lazy state initialization from localStorage
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('math_high_score') || '0', 10);
  });
  const [unlockedAchievements, setUnlockedAchievements] = useState(() => {
    return JSON.parse(localStorage.getItem('math_achievements') || '[]');
  });
  const [weakProblemHistory, setWeakProblemHistory] = useState(() => {
    return JSON.parse(localStorage.getItem('math_weak_problems') || '[]');
  });

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [currentLevelId, setCurrentLevelId] = useState(1);
  const [fivesMasterCount, setFivesMasterCount] = useState(0);

  // Visual feedback and alerts state
  const [feedbackStatus, setFeedbackStatus] = useState(null); // null, 'correct', 'wrong'
  const [newBadgeAlert, setNewBadgeAlert] = useState(null);
  const [shake, setShake] = useState(false);

  // Spaced repetition algorithm - generates harder or previously missed problems
  const generateNextProblem = () => {
    // 30% chance to repeat a missed problem from history
    if (weakProblemHistory.length > 0 && Math.random() < 0.3) {
      const randomWeak = weakProblemHistory[Math.floor(Math.random() * weakProblemHistory.length)];
      return { a: randomWeak.a, b: randomWeak.b };
    }

    const levelConfig = LEVELS.find(l => l.id === currentLevelId) || LEVELS[0];
    const pool = levelConfig.factors;
    
    const a = pool[Math.floor(Math.random() * pool.length)];
    const b = Math.floor(Math.random() * 10) + 1;

    // Randomize factor order
    return Math.random() > 0.5 ? { a, b } : { a: b, b: a };
  };

  const [currentProblem, setCurrentProblem] = useState(() => generateNextProblem());
  const [userAnswer, setUserAnswer] = useState('');

  // Trigger confetti burst
  const triggerConfetti = () => {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.7 }
    });
  };

  // Handle achievement unlock
  const unlockAchievement = (id) => {
    if (!unlockedAchievements.includes(id)) {
      const updated = [...unlockedAchievements, id];
      setUnlockedAchievements(updated);
      localStorage.setItem('math_achievements', JSON.stringify(updated));

      const badge = ACHIEVEMENTS_LIST.find(a => a.id === id);
      if (badge) {
        setNewBadgeAlert(badge);
        setTimeout(() => setNewBadgeAlert(null), 3500);
      }
    }
  };

  // Check level progression criteria
  const checkLevelUnlocks = (newScore) => {
    if (newScore >= 12 && currentLevelId < 3) {
      setCurrentLevelId(3);
      unlockAchievement('level_3_unlocked');
    } else if (newScore >= 5 && currentLevelId < 2) {
      setCurrentLevelId(2);
      unlockAchievement('level_2_unlocked');
    }
  };

  const handleKeypadClick = (value) => {
    if (feedbackStatus === 'correct' || feedbackStatus === 'wrong') return;

    if (value === 'C') {
      setUserAnswer('');
    } else if (value === 'DEL') {
      setUserAnswer(prev => prev.slice(0, -1));
    } else {
      if (userAnswer.length < 3) setUserAnswer(prev => prev + value);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!userAnswer || feedbackStatus) return;

    const { a, b } = currentProblem;
    const correctResult = a * b;

    if (parseInt(userAnswer, 10) === correctResult) {
      // SUCCESS
      const newScore = score + 1;
      const newStreak = streak + 1;
      setScore(newScore);
      setStreak(newStreak);
      setFeedbackStatus('correct');
      triggerConfetti();

      // High Score update
      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem('math_high_score', newScore.toString());
      }

      // Check Achievements
      unlockAchievement('first_win');
      if (newStreak >= 5) unlockAchievement('streak_5');
      if (newStreak >= 10) unlockAchievement('streak_10');

      if (a === 5 || b === 5) {
        const updatedFives = fivesMasterCount + 1;
        setFivesMasterCount(updatedFives);
        if (updatedFives >= 5) unlockAchievement('master_5');
      }

      checkLevelUnlocks(newScore);

      // Remove from weak problem history if solved
      const updatedWeak = weakProblemHistory.filter(p => !(p.a === a && p.b === b));
      setWeakProblemHistory(updatedWeak);
      localStorage.setItem('math_weak_problems', JSON.stringify(updatedWeak));

      setTimeout(() => {
        setFeedbackStatus(null);
        setUserAnswer('');
        setCurrentProblem(generateNextProblem());
      }, 1000);

    } else {
      // FAILURE
      setStreak(0);
      setFeedbackStatus('wrong');
      setShake(true);
      setTimeout(() => setShake(false), 500);

      // Add to spaced repetition history
      const exists = weakProblemHistory.some(p => p.a === a && p.b === b);
      if (!exists) {
        const updatedWeak = [...weakProblemHistory, { a, b }];
        setWeakProblemHistory(updatedWeak);
        localStorage.setItem('math_weak_problems', JSON.stringify(updatedWeak));
      }

      setTimeout(() => {
        setFeedbackStatus(null);
        setUserAnswer('');
      }, 3000);
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'];

  return (
    <div className={`w-screen h-screen max-h-screen flex flex-col justify-between p-3 sm:p-4 select-none overflow-hidden transition-colors duration-300 ${feedbackStatus === 'correct' ? 'bg-green-100' : feedbackStatus === 'wrong' ? 'bg-red-100' : 'bg-slate-50'}`}>
      <InstallButton/>
      {/* UNLOCKED ACHIEVEMENT POPUP */}
      {newBadgeAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-400 text-slate-900 px-5 py-3 rounded-2xl shadow-2xl border-4 border-white flex items-center gap-3 animate-bounce">
          <span className="text-4xl">{newBadgeAlert.icon}</span>
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-amber-900">New Achievement!</div>
            <div className="text-lg font-black">{newBadgeAlert.name}</div>
          </div>
        </div>
      )}

      {/* HEADER WITH SCORE, LEVEL & BEST SCORE */}
      <header className="w-full max-w-2xl mx-auto flex justify-between items-center bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-200">
        
        <div className="flex items-center gap-2">
          <span className="text-3xl sm:text-4xl">⭐</span>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase">Score</span>
            <span className="text-xl sm:text-2xl font-black text-slate-800 leading-none">{score}</span>
          </div>
        </div>

        {/* ACTIVE LEVEL */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
            Level {currentLevelId}
          </span>
          {streak > 1 && (
            <span className="text-xs font-black text-orange-500 animate-pulse mt-1">
              🔥 Streak: {streak}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-3xl sm:text-4xl">🏆</span>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-amber-500 uppercase">Best</span>
            <span className="text-xl sm:text-2xl font-black text-amber-600 leading-none">{highScore}</span>
          </div>
        </div>

      </header>

      {/* MAIN GAMEPLAY AREA */}
      <main className={`flex-1 flex flex-col justify-center items-center my-2 w-full max-w-2xl mx-auto bg-white rounded-3xl shadow-md p-4 border-2 border-slate-100 relative overflow-hidden transition-transform ${shake ? 'animate-shake' : ''}`}>
        
        <div className="text-slate-400 text-xs font-black uppercase tracking-wider mb-1">What is?</div>
        
        {/* Math Equation */}
        <div className="flex justify-center items-center gap-3 sm:gap-6 text-5xl sm:text-7xl font-black text-slate-800 my-2">
          <span className="transition-transform active:scale-110">{currentProblem.a}</span>
          <span className="text-indigo-500">×</span>
          <span className="transition-transform active:scale-110">{currentProblem.b}</span>
          <span className="text-indigo-500">=</span>
        </div>

        {/* Input Box */}
        <div className="flex justify-center w-full my-1">
          <div className={`text-center text-5xl sm:text-6xl font-mono font-black w-full max-w-xs h-16 flex items-center justify-center border-b-4 border-indigo-400 text-slate-900 ${feedbackStatus === 'correct' ? 'text-green-600 border-green-500 scale-105' : ''} ${feedbackStatus === 'wrong' ? 'text-red-500 border-red-500 line-through' : ''} transition-all`}>
            {userAnswer || <span className="text-slate-200">?</span>}
          </div>
        </div>

        {/* Correction Hint */}
        {feedbackStatus === 'wrong' && (
          <div className="mt-2 p-2 px-4 bg-amber-100 border-2 border-amber-400 rounded-xl flex items-center justify-center gap-2 text-xl font-black text-slate-800 animate-bounce">
            <span>Correct answer:</span>
            <span className="bg-amber-500 text-white px-2 py-0.5 rounded-lg text-2xl font-black">
              {currentProblem.a * currentProblem.b}
            </span>
          </div>
        )}
      </main>

      {/* ACHIEVEMENTS BAR */}
      <section className="w-full max-w-2xl mx-auto bg-white/80 backdrop-blur-sm p-2 rounded-xl border border-slate-200 mb-2 flex justify-around items-center">
        {ACHIEVEMENTS_LIST.map(badge => {
          const isUnlocked = unlockedAchievements.includes(badge.id);
          return (
            <div 
              key={badge.id} 
              title={`${badge.name}: ${badge.desc}`}
              className={`flex flex-col items-center transition-all ${isUnlocked ? 'scale-100 opacity-100' : 'scale-90 opacity-20 grayscale'}`}
            >
              <span className="text-2xl">{badge.icon}</span>
            </div>
          );
        })}
      </section>

      {/* KEYPAD & SUBMIT ACTION */}
      <footer className="w-full max-w-2xl mx-auto flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2">
          {keys.map(key => (
            <button
              key={key}
              onClick={() => handleKeypadClick(key)}
              disabled={feedbackStatus === 'wrong'}
              className={`
                text-2xl font-black h-12 sm:h-14 rounded-xl shadow-sm transition-all active:scale-90 active:bg-indigo-200
                ${key === 'C' ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : ''}
                ${key === 'DEL' ? 'bg-red-100 text-red-700 hover:bg-red-200' : ''}
                ${(key !== 'C' && key !== 'DEL') ? 'bg-white text-slate-800 border-b-2 border-slate-200 hover:bg-slate-50' : ''}
                ${feedbackStatus === 'wrong' ? 'opacity-40 cursor-not-allowed' : ''}
              `}
            >
              {key === 'DEL' ? '⌫' : key}
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!userAnswer || !!feedbackStatus}
          className={`
            w-full text-xl font-black py-3 rounded-2xl shadow-md border-b-4 transition-all active:scale-98
            ${feedbackStatus === 'correct' ? 'bg-green-500 text-white border-green-700' : ''}
            ${feedbackStatus === 'wrong' ? 'bg-red-400 text-white border-red-600' : ''}
            ${(!userAnswer && !feedbackStatus) ? 'bg-slate-300 text-slate-500 border-slate-400 cursor-not-allowed' : ''}
            ${(userAnswer && !feedbackStatus) ? 'bg-indigo-600 text-white border-indigo-800 hover:bg-indigo-700' : ''}
          `}
        >
          {feedbackStatus === 'correct' && 'Great job! 🎉'}
          {feedbackStatus === 'wrong' && 'Try again in a moment...'}
          {!feedbackStatus && 'CHECK ➔'}
        </button>
      </footer>

    </div>
  );
}