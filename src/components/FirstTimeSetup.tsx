import { useState, useEffect } from 'react';
import { Theme, ThemeSelector } from './ThemeSelector';
import { User, Sparkles, Coins } from 'lucide-react';
import { trackEvent } from '@aptabase/tauri';
import { CURRENCIES } from '../types';

interface FirstTimeSetupProps {
  onComplete: (name: string, theme: Theme, currency: string) => void;
}

export function FirstTimeSetup({ onComplete }: FirstTimeSetupProps) {
  const [name, setName] = useState('');
  const [theme, setTheme] = useState<Theme>('system');
  const [currency, setCurrency] = useState('NPR');
  const [step, setStep] = useState(1);

  useEffect(() => {
    trackEvent("setup_started");
  }, []);

  const handleNext = () => {
    if (step === 1 && name.trim()) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      onComplete(name.trim(), theme, currency);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
        <div className="p-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
                Welcome to Anvesha <Sparkles className="text-teal-500" />
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 mt-2">
                Let's personalize your experience.
              </p>
            </div>
            <div className="flex gap-1">
              <div className={`w-2 h-2 rounded-full transition-colors ${step === 1 ? 'bg-teal-500' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
              <div className={`w-2 h-2 rounded-full transition-colors ${step === 2 ? 'bg-teal-500' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
              <div className={`w-2 h-2 rounded-full transition-colors ${step === 3 ? 'bg-teal-500' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
            </div>
          </div>

          {step === 1 ? (
            <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">
                  What should we call you?
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-teal-500 transition-colors">
                    <User size={20} />
                  </div>
                  <input
                    type="text"
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name..."
                    onKeyDown={(e) => e.key === 'Enter' && name.trim() && handleNext()}
                    className="w-full pl-12 pr-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl text-lg text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all outline-none"
                  />
                </div>
              </div>
              <button
                onClick={handleNext}
                disabled={!name.trim()}
                className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold text-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-xl shadow-zinc-500/10 dark:shadow-none"
              >
                Continue
              </button>
            </div>
          ) : step === 2 ? (
            <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">
                  Choose your preferred theme
                </label>
                <ThemeSelector selected={theme} onSelect={setTheme} />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-2xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-[0.98]"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex-[2] py-4 bg-teal-600 text-white rounded-2xl font-bold text-lg hover:bg-teal-500 active:scale-[0.98] transition-all shadow-xl shadow-teal-500/20"
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">
                  Select System Currency
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-teal-500 transition-colors pointer-events-none">
                    <Coins size={20} />
                  </div>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl text-lg text-zinc-900 dark:text-white appearance-none focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all outline-none cursor-pointer"
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code} className="bg-white dark:bg-zinc-900">
                        {c.code} - {c.name} ({c.symbol})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-2 px-1">
                  * All your transactions will be tracked in this currency. You can change this later in settings.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-2xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-[0.98]"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex-[2] py-4 bg-teal-600 text-white rounded-2xl font-bold text-lg hover:bg-teal-500 active:scale-[0.98] transition-all shadow-xl shadow-teal-500/20"
                >
                  Start Budgeting
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
