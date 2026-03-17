import { useState, useEffect } from 'react';
import { BankAccount } from '../types';
import { Pencil, Trash2, Check, X, Plus } from 'lucide-react';
import { useDialog } from './DialogProvider';
import { Theme } from './ThemeSelector';
import textLight from '../assets/text-light.png';
import textDark from '../assets/text-dark.png';

interface SidebarProps {
    years: string[];
    selectedYear: string | null;
    onSelectYear: (year: string) => void;
    onAddYear: (year: string) => void;
    onUpdateYear?: (oldYear: string, newYear: string) => void;
    onDeleteYear?: (year: string) => void;
    accounts: BankAccount[];
    onAddAccount: (name: string, color: string) => void;
    onUpdateAccount?: (id: number, name: string, color?: string) => void;
    onDeleteAccount?: (id: number) => void;
    userName: string;
    theme: Theme;
}

export function Sidebar({
    years,
    selectedYear,
    onSelectYear,
    onAddYear,
    onUpdateYear,
    onDeleteYear,
    accounts,
    onAddAccount,
    onUpdateAccount,
    onDeleteAccount,
    userName,
    theme
}: SidebarProps) {
    const { showConfirm } = useDialog();
    const [isAddingYear, setIsAddingYear] = useState(false);
    const [newYearInput, setNewYearInput] = useState('');

    // Year Edit State
    const [editingYear, setEditingYear] = useState<string | null>(null);
    const [editYearInput, setEditYearInput] = useState('');

    // Account Edit State
    const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
    const [editAccountName, setEditAccountName] = useState('');
    const [editAccountColor, setEditAccountColor] = useState('');

    // Account Add State
    const [isAddingAccount, setIsAddingAccount] = useState(false);
    const [newAccountName, setNewAccountName] = useState('');
    const [newAccountColor, setNewAccountColor] = useState('#14b8a6');

    // Resizing State
    const [sidebarWidth, setSidebarWidth] = useState(() => Math.max(200, window.innerWidth * 0.15));
    const [isResizing, setIsResizing] = useState(false);

    // User Name Edit State - Still kept for greeting but simplified

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const maxWidth = Math.min(480, window.innerWidth * 0.45);
            const newWidth = Math.max(200, Math.min(maxWidth, e.clientX));
            setSidebarWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        // Prevent text selection while dragging
        document.body.style.userSelect = 'none';

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
        };
    }, [isResizing]);

    const handleAddYear = () => {
        const y = newYearInput.trim();
        if (y && !years.includes(y)) {
            onAddYear(y);
        }
        setIsAddingYear(false);
        setNewYearInput('');
    };

    const handleSaveYearEdit = (oldYear: string) => {
        const y = editYearInput.trim();
        if (y && onUpdateYear) {
            onUpdateYear(oldYear, y);
        }
        setEditingYear(null);
    };

    const handleSaveAccountEdit = (acc: BankAccount) => {
        if (editAccountName.trim() && onUpdateAccount) {
            onUpdateAccount(acc.id, editAccountName.trim(), editAccountColor);
        }
        setEditingAccountId(null);
    };

    const handleAddAccountSubmit = () => {
        const name = newAccountName.trim();
        if (name) {
            onAddAccount(name, newAccountColor);
        }
        setIsAddingAccount(false);
        setNewAccountName('');
        setNewAccountColor('#14b8a6');
    };

    const isEffectiveDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    return (
        <div
            className="flex flex-col h-full bg-zinc-50/50 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800 relative group/sidebar shrink-0 transition-[width] duration-0"
            style={{ width: `${sidebarWidth}px`, minWidth: '200px' }}
        >
            {/* Custom Resizer Handle */}
            <div
                className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-teal-500/50 flex items-center justify-center transition-colors z-50 group-hover/sidebar:bg-zinc-300 dark:group-hover/sidebar:bg-zinc-700/50"
                onMouseDown={() => setIsResizing(true)}
            >
                <div className="h-8 w-1 bg-zinc-400 dark:bg-zinc-500 rounded-full opacity-0 group-hover/sidebar:opacity-100 transition-opacity"></div>
            </div>

            <div className="px-6 h-[65px] flex items-center flex-shrink-0">
                <img 
                    src={isEffectiveDark ? textDark : textLight} 
                    alt="anveshaFi" 
                    className="h-6 w-auto object-contain"
                />
            </div>

            <div className="px-6 pb-8 flex-1 overflow-y-auto custom-scrollbar">
                {/* Year Section */}
                <div className="mb-24">
                    <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">Year</h2>
                    <div className="flex flex-col space-y-3">
                        {years.slice().sort((a, b) => a.localeCompare(b)).map(year => (
                            <div key={year} className="group flex items-center justify-between">
                                {editingYear === year ? (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="text"
                                            value={editYearInput}
                                            onChange={e => setEditYearInput(e.target.value)}
                                            className="bg-zinc-100 dark:bg-black/20 border border-teal-500/50 rounded px-2 py-1 text-sm w-20 text-zinc-900 dark:text-white outline-none"
                                            autoFocus
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleSaveYearEdit(year);
                                                if (e.key === 'Escape') setEditingYear(null);
                                            }}
                                        />
                                        <button onClick={() => handleSaveYearEdit(year)} className="p-1 text-teal-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded cursor-pointer"><Check size={14} /></button>
                                        <button onClick={() => setEditingYear(null)} className="p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded cursor-pointer"><X size={14} /></button>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => onSelectYear(year)}
                                            className={`text-left text-sm transition-all duration-200 cursor-pointer flex-1 px-3 py-1.5 rounded-lg border ${selectedYear === year ? 'bg-white dark:bg-zinc-800 shadow-sm border-zinc-200/80 dark:border-zinc-700/80 font-bold text-teal-600 dark:text-teal-400 transform scale-[1.02]' : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
                                        >
                                            {year}
                                        </button>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => { setEditingYear(year); setEditYearInput(year); }}
                                                className="p-1 text-zinc-400 hover:text-teal-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded cursor-pointer"
                                            >
                                                <Pencil size={12} />
                                            </button>
                                            <button
                                                onClick={() => onDeleteYear && onDeleteYear(year)}
                                                className="p-1 text-zinc-400 hover:text-rose-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded cursor-pointer"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}

                        {isAddingYear ? (
                            <div className="flex items-center">
                                <input
                                    type="text"
                                    value={newYearInput}
                                    onChange={e => setNewYearInput(e.target.value)}
                                    className="bg-zinc-100 dark:bg-black/20 border border-teal-500/50 rounded px-2 py-1.5 text-sm w-24 text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-teal-500/50"
                                    placeholder="YYYY/YY"
                                    autoFocus
                                    onBlur={() => !newYearInput && setIsAddingYear(false)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleAddYear();
                                        if (e.key === 'Escape') setIsAddingYear(false);
                                    }}
                                />
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsAddingYear(true)}
                                className="flex items-center text-sm text-zinc-600 dark:text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 cursor-pointer font-medium transition-colors"
                            >
                                <Plus size={14} className="mr-1.5" /> Add New
                            </button>
                        )}
                    </div>
                </div>

                {/* Account Section */}
                <div>
                    <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">Account</h2>
                    <div className="flex flex-col space-y-3">
                        {accounts.map(acc => (
                            <div key={acc.id} className="group flex items-center justify-between">
                                {editingAccountId === acc.id ? (
                                    <div className="flex items-center gap-1 w-full">
                                        <input
                                            type="color"
                                            value={editAccountColor}
                                            onChange={e => setEditAccountColor(e.target.value)}
                                            className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent flex-[0_0_auto]"
                                        />
                                        <input
                                            type="text"
                                            value={editAccountName}
                                            onChange={e => setEditAccountName(e.target.value)}
                                            className="bg-zinc-100 dark:bg-black/20 border border-teal-500/50 rounded px-2 py-1 text-sm flex-1 min-w-0 text-zinc-900 dark:text-white outline-none"
                                            autoFocus
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleSaveAccountEdit(acc);
                                                if (e.key === 'Escape') setEditingAccountId(null);
                                            }}
                                        />
                                        <button onClick={() => handleSaveAccountEdit(acc)} className="p-1 text-teal-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded cursor-pointer"><Check size={14} /></button>
                                        <button onClick={() => setEditingAccountId(null)} className="p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded cursor-pointer"><X size={14} /></button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-sm text-zinc-600 dark:text-zinc-400 flex items-center gap-2 flex-1 truncate">
                                            <div className="flex-[0_0_auto] w-2.5 h-2.5 rounded-full" style={{ backgroundColor: acc.color || '#14b8a6' }}></div>
                                            <span className="truncate">{acc.name}</span>
                                        </div>
                                        <div className="flex-[0_0_auto] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                            <button
                                                onClick={() => { setEditingAccountId(acc.id); setEditAccountName(acc.name); setEditAccountColor(acc.color || '#14b8a6'); }}
                                                className="p-1 text-zinc-400 hover:text-teal-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded cursor-pointer"
                                                title="Rename"
                                            >
                                                <Pencil size={12} />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const confirmed = await showConfirm(`Delete account ${acc.name}?`);
                                                    if (confirmed) {
                                                        onDeleteAccount && onDeleteAccount(acc.id);
                                                    }
                                                }}
                                                className="p-1 text-zinc-400 hover:text-rose-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded cursor-pointer"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}

                        {isAddingAccount ? (
                            <div className="flex items-center gap-2 w-full mt-2">
                                <input
                                    type="color"
                                    value={newAccountColor}
                                    onChange={e => setNewAccountColor(e.target.value)}
                                    className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent flex-[0_0_auto]"
                                />
                                <input
                                    type="text"
                                    value={newAccountName}
                                    onChange={e => setNewAccountName(e.target.value)}
                                    className="bg-zinc-100 dark:bg-black/20 border border-teal-500/50 rounded px-2 py-1.5 text-sm flex-1 min-w-0 text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-teal-500/50"
                                    placeholder="Account Name"
                                    autoFocus
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleAddAccountSubmit();
                                        if (e.key === 'Escape') setIsAddingAccount(false);
                                    }}
                                />
                                <button onClick={handleAddAccountSubmit} className="p-1 text-teal-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded cursor-pointer flex-[0_0_auto]">
                                    <Check size={14} />
                                </button>
                                <button onClick={() => setIsAddingAccount(false)} className="p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded cursor-pointer flex-[0_0_auto]">
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsAddingAccount(true)}
                                className="flex items-center text-sm text-zinc-600 dark:text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 cursor-pointer font-medium transition-colors mt-2"
                            >
                                <Plus size={14} className="mr-1.5" /> Add New
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Simple User Display at Bottom */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 px-5 py-5 mt-auto">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-teal-500/20">
                        <span className="text-white text-sm font-bold uppercase">
                            {userName ? userName.charAt(0) : '?'}
                        </span>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-500 font-medium uppercase tracking-wider leading-tight">Welcome</span>
                        <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">
                            {userName || 'Guest'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
