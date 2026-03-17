import { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { AlertCircle, HelpCircle, User } from 'lucide-react';

type DialogOptions = {
    title?: string;
    message: string;
};

type PromptOptions = {
    title?: string;
    message: string;
    placeholder?: string;
    defaultValue?: string;
};

type DialogContextType = {
    showAlert: (options: DialogOptions | string) => Promise<void>;
    showConfirm: (options: DialogOptions | string) => Promise<boolean>;
    showPrompt: (options: PromptOptions) => Promise<string | null>;
};

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function useDialog() {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
}

export function DialogProvider({ children }: { children: ReactNode }) {
    const [dialog, setDialog] = useState<{
        isOpen: boolean;
        type: 'alert' | 'confirm' | 'prompt';
        title: string;
        message: string;
        placeholder?: string;
        resolve: (value: any) => void;
    } | null>(null);

    const [promptValue, setPromptValue] = useState('');
    const promptInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (dialog?.type === 'prompt' && dialog.isOpen) {
            setTimeout(() => promptInputRef.current?.focus(), 100);
        }
    }, [dialog]);

    const showAlert = (options: DialogOptions | string) => {
        return new Promise<void>((resolve) => {
            const message = typeof options === 'string' ? options : options.message;
            const title = typeof options === 'string' ? 'Attention' : (options.title || 'Attention');

            setDialog({
                isOpen: true,
                type: 'alert',
                title,
                message,
                resolve: () => resolve(),
            });
        });
    };

    const showConfirm = (options: DialogOptions | string) => {
        return new Promise<boolean>((resolve) => {
            const message = typeof options === 'string' ? options : options.message;
            const title = typeof options === 'string' ? 'Confirm Action' : (options.title || 'Confirm Action');

            setDialog({
                isOpen: true,
                type: 'confirm',
                title,
                message,
                resolve,
            });
        });
    };

    const showPrompt = (options: PromptOptions) => {
        return new Promise<string | null>((resolve) => {
            setPromptValue(options.defaultValue || '');
            setDialog({
                isOpen: true,
                type: 'prompt',
                title: options.title || 'Input Required',
                message: options.message,
                placeholder: options.placeholder,
                resolve,
            });
        });
    };

    const handleClose = (result: boolean) => {
        if (dialog) {
            if (dialog.type === 'prompt') {
                dialog.resolve(result ? promptValue.trim() || null : null);
            } else {
                dialog.resolve(result);
            }
            setDialog(null);
            setPromptValue('');
        }
    };

    return (
        <DialogContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
            {children}

            {dialog && dialog.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl max-w-md w-full animate-in zoom-in-95 duration-200 overflow-hidden">

                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-full flex-shrink-0 ${dialog.type === 'alert' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                                    dialog.type === 'prompt' ? 'bg-teal-100 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400' :
                                        'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                                    }`}>
                                    {dialog.type === 'alert' ? <AlertCircle size={24} /> :
                                        dialog.type === 'prompt' ? <User size={24} /> :
                                            <HelpCircle size={24} />}
                                </div>
                                <div className="flex-1 pt-1">
                                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2 tracking-tight">
                                        {dialog.title}
                                    </h3>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                        {dialog.message}
                                    </p>
                                    {dialog.type === 'prompt' && (
                                        <input
                                            ref={promptInputRef}
                                            type="text"
                                            value={promptValue}
                                            onChange={e => setPromptValue(e.target.value)}
                                            placeholder={dialog.placeholder || ''}
                                            onKeyDown={e => { if (e.key === 'Enter' && promptValue.trim()) handleClose(true); }}
                                            className="mt-3 w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-end gap-3">
                            {dialog.type === 'confirm' && (
                                <button
                                    onClick={() => handleClose(false)}
                                    className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            )}
                            {dialog.type === 'prompt' && (
                                <button
                                    onClick={() => handleClose(false)}
                                    className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    Skip
                                </button>
                            )}
                            <button
                                onClick={() => handleClose(true)}
                                disabled={dialog.type === 'prompt' && !promptValue.trim()}
                                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-all focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed ${dialog.type === 'alert'
                                    ? 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500 shadow-sm shadow-amber-500/20'
                                    : dialog.type === 'prompt'
                                        ? 'bg-teal-500 hover:bg-teal-600 focus:ring-teal-500 shadow-sm shadow-teal-500/20'
                                        : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500 shadow-sm shadow-blue-500/20'
                                    }`}
                            >
                                {dialog.type === 'alert' ? 'Okay' : dialog.type === 'prompt' ? 'Save' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DialogContext.Provider>
    );
}
