import { Sun, Moon, Monitor } from 'lucide-react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeSelectorProps {
  selected: Theme;
  onSelect: (theme: Theme) => void;
}

export function ThemeSelector({ selected, onSelect }: ThemeSelectorProps) {
  const options: { id: Theme; label: string; icon: any }[] = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 mt-4">
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = selected === option.id;
        return (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300 group ${
              isActive
                ? 'bg-teal-500/10 border-teal-500 text-teal-600 dark:text-teal-400'
                : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/50 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
            }`}
          >
            <div
              className={`p-3 rounded-xl transition-colors ${
                isActive
                  ? 'bg-teal-500 text-white'
                  : 'bg-white dark:bg-zinc-800 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 border border-zinc-200 dark:border-zinc-700'
              }`}
            >
              <Icon size={24} />
            </div>
            <span className="text-sm font-semibold tracking-tight">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
