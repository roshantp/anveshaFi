import { invoke } from '@tauri-apps/api/core';
import { Download, Sun, Moon, Settings, User, RotateCcw, Coins } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Theme } from './ThemeSelector';
import { CURRENCIES } from '../types';

interface NavigationProps {
    months: number[];
    selectedMonth: number | null;
    onSelectMonth: (month: number) => void;
    selectedYear: string | null;
    theme: Theme;
    onThemeChange: (theme: Theme) => void;
    monthType: 'Nepali' | 'English';
    onToggleMonthType: () => void;
    userName: string;
    onUpdateUserName: (name: string) => void;
    onReset: () => void;
    systemCurrency: string;
    onUpdateSystemCurrency: (currency: string) => void;
}

const NEPALI_MONTHS = [
    "Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
    "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
];

const ENGLISH_MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function Navigation({
    months,
    selectedMonth,
    onSelectMonth,
    selectedYear,
    theme,
    onThemeChange,
    monthType,
    onToggleMonthType,
    userName,
    onUpdateUserName,
    onReset,
    systemCurrency,
    onUpdateSystemCurrency
}: NavigationProps) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(userName);
    const settingsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
                setIsSettingsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    useEffect(() => {
        setNewName(userName);
    }, [userName, isSettingsOpen]);

    const handleExportYear = async () => {
        if (!selectedYear) return;
        try {
            const result: string = await invoke('export_year_csv', { year: selectedYear });
            console.log(result);
        } catch (e) {
            if (e !== 'Export cancelled') console.error(e);
        }
    };

    const handleExportMonth = async () => {
        if (!selectedYear || !selectedMonth) return;
        try {
            const result: string = await invoke('export_month_csv', {
                year: selectedYear,
                month: selectedMonth,
                monthType: monthType
            });
            console.log(result);
        } catch (e) {
            if (e !== 'Export cancelled') console.error(e);
        }
    };

    return (
        <div className="flex items-center w-full h-[65px] bg-white dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-transparent relative z-30 px-6">
            <div id="tour-months" className="flex gap-3 items-center overflow-x-auto custom-scrollbar flex-1 py-1 pr-4 pl-1 scroll-smooth">
                {months.sort((a, b) => a - b).map(month => (
                    <button
                        key={month}
                        onClick={() => onSelectMonth(month)}
                        className={`text-xs tracking-wide transition-all duration-300 font-medium whitespace-nowrap cursor-pointer px-5 py-2 rounded-full border ${selectedMonth === month ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 shadow-md transform scale-105' : 'bg-zinc-50 dark:bg-zinc-800/40 text-zinc-600 border-zinc-200/80 dark:border-zinc-700/50 hover:bg-zinc-100 dark:hover:bg-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                    >
                        {monthType === 'Nepali' ? NEPALI_MONTHS[month - 1] : ENGLISH_MONTHS[month - 1]}
                    </button>
                ))}
            </div>

            {/* Export CTAs */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <button
                    onClick={handleExportMonth}
                    disabled={!selectedYear || !selectedMonth}
                    title={`Export ${selectedMonth ? (monthType === 'Nepali' ? NEPALI_MONTHS[selectedMonth - 1] : ENGLISH_MONTHS[selectedMonth - 1]) : 'month'} data`}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/50 text-zinc-600 dark:text-zinc-400 hover:bg-teal-500/10 hover:text-teal-600 dark:hover:text-teal-400 hover:border-teal-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                    <Download size={12} />
                    Month
                </button>
                <button
                    onClick={handleExportYear}
                    disabled={!selectedYear}
                    title={`Export all of ${selectedYear}`}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/50 text-zinc-600 dark:text-zinc-400 hover:bg-teal-500/10 hover:text-teal-600 dark:hover:text-teal-400 hover:border-teal-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                    <Download size={12} />
                    Year
                </button>
                <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1" />
                <button
                    id="tour-month-toggle"
                    onClick={onToggleMonthType}
                    className="bg-zinc-100 dark:bg-zinc-800/60 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 px-2 py-1.5 rounded-xl transition-all border border-zinc-200 dark:border-zinc-700/50 text-teal-600 dark:text-teal-400 font-bold text-[10px] tracking-wider cursor-pointer flex items-center justify-center min-w-[32px]"
                    title="Toggle Calendar Language"
                >
                    {monthType === 'Nepali' ? 'NP' : 'EN'}
                </button>
                <button
                    id="tour-theme-toggle"
                    onClick={() => {
                        const isCurrentlyDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                        onThemeChange(isCurrentlyDark ? 'light' : 'dark');
                    }}
                    className="bg-zinc-100 dark:bg-zinc-800/60 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 p-1.5 rounded-xl transition-all border border-zinc-200 dark:border-zinc-700/50 text-amber-500 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-white cursor-pointer"
                    title={
                        theme === 'system' 
                        ? `System Theme (${window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light'}) - Click to switch manually`
                        : `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`
                    }
                >
                    {(theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) 
                        ? <Moon size={15} /> 
                        : <Sun size={15} />
                    }
                </button>

                <div className="relative" ref={settingsRef}>
                    <button
                        id="tour-settings"
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className={`p-1.5 rounded-xl transition-all border cursor-pointer ${isSettingsOpen ? 'bg-teal-500 text-white border-teal-500' : 'bg-zinc-100 dark:bg-zinc-800/60 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 border-zinc-200 dark:border-zinc-700/50 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
                        title="Settings"
                    >
                        <Settings size={15} />
                    </button>

                    {isSettingsOpen && (
                        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-4 animate-in zoom-in-95 duration-200 origin-top-right">
                            <div className="space-y-4">
                                <div className="px-1">
                                    <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">User Preferences</h4>
                                    
                                    {isEditingName ? (
                                        <div className="space-y-2">
                                            <input 
                                                type="text"
                                                value={newName}
                                                onChange={e => setNewName(e.target.value)}
                                                autoFocus
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        onUpdateUserName(newName);
                                                        setIsEditingName(false);
                                                    }
                                                    if (e.key === 'Escape') setIsEditingName(false);
                                                }}
                                                className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 outline-none focus:border-teal-500"
                                            />
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => { onUpdateUserName(newName); setIsEditingName(false); }}
                                                    className="flex-1 py-1 px-2 bg-teal-500 text-white text-xs font-bold rounded-lg"
                                                >
                                                    Save
                                                </button>
                                                <button 
                                                    onClick={() => setIsEditingName(false)}
                                                    className="flex-1 py-1 px-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-bold rounded-lg"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => { setIsEditingName(true); setNewName(userName); }}
                                            className="w-full flex items-center justify-between p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center">
                                                    <User size={14} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate w-32">{userName || 'Set Name'}</p>
                                                    <p className="text-[10px] text-zinc-500">Edit display name</p>
                                                </div>
                                            </div>
                                        </button>
                                    )}
                                </div>

                                <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-1" />

                                <div className="px-1">
                                    <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">System Currency</h4>
                                    <div className="flex items-center gap-3 p-2">
                                        <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center flex-shrink-0">
                                            <Coins size={14} />
                                        </div>
                                        <select
                                            value={systemCurrency}
                                            onChange={e => onUpdateSystemCurrency(e.target.value)}
                                            className="flex-1 min-w-0 overflow-hidden text-ellipsis px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 outline-none focus:border-teal-500 cursor-pointer font-bold"
                                        >
                                            {CURRENCIES.map(c => (
                                                <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="px-1">
                                    <h4 className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-3">Zone Danger</h4>
                                    <button 
                                        onClick={() => { onReset(); setIsSettingsOpen(false); }}
                                        className="w-full flex items-center gap-3 p-2 hover:bg-rose-500/10 text-rose-500 rounded-xl transition-colors group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 group-hover:bg-rose-500/20 flex items-center justify-center">
                                            <RotateCcw size={14} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-bold">Reset Application</p>
                                            <p className="text-[10px] opacity-70">Wipe all data & start over</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
