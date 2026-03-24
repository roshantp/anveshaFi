import { useState, useEffect, useRef } from 'react';
import { X, Sparkles } from 'lucide-react';

interface OnboardingTourProps {
  onComplete: () => void;
  userName: string;
}

interface TourStep {
  title: string;
  content: string;
  targetId: string;
  position: 'right' | 'left' | 'top' | 'bottom';
}

export function OnboardingTour({ onComplete, userName }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const steps: TourStep[] = [
    {
      title: `Welcome, ${userName}!`,
      content: "Let's quickly show you how to use AnveshaFi. Click 'Continue' to start the interactive tour.",
      targetId: '', // Center screen for first step
      position: 'bottom',
    },
    {
      title: "Add Years",
      content: "Organize your data by years. Click here to add a new year (e.g. 2080 or 2024).",
      targetId: 'tour-add-year',
      position: 'right',
    },
    {
      title: "Manage Accounts",
      content: "Create multiple accounts like 'Cash', 'Bank', or 'Savings' to track them separately.",
      targetId: 'tour-add-account',
      position: 'right',
    },
    {
      title: "Switch Months",
      content: "Easily navigate between different months of the selected year.",
      targetId: 'tour-months',
      position: 'bottom',
    },
    {
      title: "Toggle Calendar",
      content: "Switch between Nepali (BS) and English (AD) month names instantly.",
      targetId: 'tour-month-toggle',
      position: 'left',
    },
    {
      title: "Custom Columns",
      content: "Add your own columns (Text, Number, Date, Dropdown, or Currency) to any ledger.",
      targetId: 'tour-add-column',
      position: 'left',
    },
    {
      title: "Settings & Currency",
      content: "Change your system currency, theme, or reset data here.",
      targetId: 'tour-settings',
      position: 'left',
    },
    {
      title: "All Set!",
      content: "You're ready to start tracking. Your data is 100% private and stored locally.",
      targetId: '',
      position: 'bottom',
    }
  ];

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;
    setIsVisible(false);

    const updatePosition = (isInitial = false) => {
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);

      const step = steps[currentStep];
      if (!step.targetId) {
        setCoords({ top: 0, left: 0, width: 0, height: 0 });
        setIsVisible(true);
        return;
      }

      const el = document.getElementById(step.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        // Check if element has actual dimensions and is visible
        if (rect.width > 0 && rect.height > 0) {
          setCoords({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          });
          setIsVisible(true);
          if (isInitial) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else if (retryCount < maxRetries) {
          retryCount++;
          updateTimerRef.current = setTimeout(() => updatePosition(true), 200);
        } else {
          // Fallback to center if element found but not visible/valid
          setCoords({ top: 0, left: 0, width: 0, height: 0 });
          setIsVisible(true);
        }
      } else if (retryCount < maxRetries) {
        retryCount++;
        updateTimerRef.current = setTimeout(() => updatePosition(true), 200);
      } else {
        // Fallback to center if element not found after retries
        setCoords({ top: 0, left: 0, width: 0, height: 0 });
        setIsVisible(true);
      }
    };

    updateTimerRef.current = setTimeout(() => updatePosition(true), 150);

    // Throttled scroll/resize listener
    const handleScrollOrResize = () => {
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
      updateTimerRef.current = setTimeout(() => updatePosition(false), 50);
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true); // Catch nested scrolls
    return () => {
        if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = steps[currentStep];

  // Tooltip positioning logic
  const getTooltipStyle = (): React.CSSProperties => {
    if (!step.targetId || (coords.width === 0 && coords.height === 0)) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed',
      };
    }

    const gap = 12;
    switch (step.position) {
      case 'right':
        return {
          top: coords.top + coords.height / 2,
          left: coords.left + coords.width + gap,
          transform: 'translateY(-50%)',
          position: 'absolute',
        };
      case 'left':
        return {
          top: coords.top + coords.height / 2,
          left: coords.left - gap,
          transform: 'translate(-100%, -50%)',
          position: 'absolute',
        };
      case 'top':
        return {
          top: coords.top - gap,
          left: coords.left + coords.width / 2,
          transform: 'translate(-50%, -100%)',
          position: 'absolute',
        };
      case 'bottom':
      default:
        return {
          top: coords.top + coords.height + gap,
          left: coords.left + coords.width / 2,
          transform: 'translateX(-50%)',
          position: 'absolute',
        };
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Dimmed Background Overlay with Hole */}
      <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[1px] pointer-events-auto" style={{
        clipPath: step.targetId && coords.width > 0 ? `polygon(0% 0%, 0% 100%, ${coords.left}px 100%, ${coords.left}px ${coords.top}px, ${coords.left + coords.width}px ${coords.top}px, ${coords.left + coords.width}px ${coords.top + coords.height}px, ${coords.left}px ${coords.top + coords.height}px, ${coords.left}px 100%, 100% 100%, 100% 0%)` : 'none'
      }} />

      {/* The Tooltip */}
      <div 
        style={getTooltipStyle()}
        className="w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 pointer-events-auto animate-in fade-in zoom-in-95 duration-300"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 bg-teal-500/10 rounded-lg text-teal-600">
            <Sparkles size={18} />
          </div>
          <button onClick={onComplete} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <X size={18} />
          </button>
        </div>

        <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">
          {step.title}
        </h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-5">
          {step.content}
        </p>

        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1 rounded-full transition-all ${idx === currentStep ? 'w-4 bg-teal-500' : 'w-1 bg-zinc-200 dark:bg-zinc-800'}`} 
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-[10px] font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-4 py-1.5 bg-teal-600 text-white rounded-lg text-[10px] font-bold hover:bg-teal-500 transition-all shadow-md shadow-teal-500/20"
            >
              {currentStep === steps.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </div>

        {/* Arrow (only if anchored to a valid element) */}
        {step.targetId && coords.width > 0 && (
            <div 
                className={`absolute w-3 h-3 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rotate-45 ${
                    step.position === 'bottom' ? '-top-1.5 left-1/2 -translate-x-1/2 border-t border-l' :
                    step.position === 'top' ? '-bottom-1.5 left-1/2 -translate-x-1/2 border-b border-r' :
                    step.position === 'right' ? '-left-1.5 top-1/2 -translate-y-1/2 border-b border-l' :
                    step.position === 'left' ? '-right-1.5 top-1/2 -translate-y-1/2 border-t border-r' : ''
                }`}
            />
        )}
      </div>
    </div>
  );
}
