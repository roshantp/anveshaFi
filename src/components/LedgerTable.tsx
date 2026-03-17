import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { BankAccount } from '../types';
import { Plus, Trash2, Edit2, Check, X, RotateCcw } from 'lucide-react';
import { useDialog } from './DialogProvider';

interface LedgerTableProps {
    account: BankAccount;
    year: string;
    month: number;
}

export interface CustomColumn {
    name: string;
    type: 'text' | 'number' | 'date' | 'dropdown';
    options?: string[];
}

export interface Transaction {
    id: number;
    bank_account_id: number;
    year: string;
    month: number;
    transaction_date: string;
    amount: number;
    transaction_type: 'Credit' | 'Debit';
    remarks: string | null;
    custom_data: string | null; // JSON string
}

export function LedgerTable({ account, year, month }: LedgerTableProps) {
    const { showAlert, showConfirm } = useDialog();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [initialBalance, setInitialBalance] = useState(0);
    const [inputBalance, setInputBalance] = useState('');
    const [loading, setLoading] = useState(true);

    // Custom Columns State (Saved locally for simplicity)
    const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
    const [isAddingCol, setIsAddingCol] = useState(false);
    const [newColName, setNewColName] = useState('');
    const [newColType, setNewColType] = useState<'text' | 'number' | 'date' | 'dropdown'>('text');
    const [newColOptions, setNewColOptions] = useState(''); // Comma separated

    // Edit Custom Column State
    const [editingColName, setEditingColName] = useState<string | null>(null);
    const [editColName, setEditColName] = useState('');
    const [editColType, setEditColType] = useState<'text' | 'number' | 'date' | 'dropdown'>('text');
    const [editColOptions, setEditColOptions] = useState('');

    // New Transaction Form State
    const [newTxDate, setNewTxDate] = useState('');
    const [newTxAmount, setNewTxAmount] = useState('');
    const [newTxType, setNewTxType] = useState<'Credit' | 'Debit'>('Debit');
    const [newTxRemarks, setNewTxRemarks] = useState('');
    const [newTxCustom, setNewTxCustom] = useState<Record<string, string>>({});
    const [txErrors, setTxErrors] = useState<{ date?: boolean; amount?: boolean }>({});

    // Edit Transaction State
    const [editingTxId, setEditingTxId] = useState<number | null>(null);
    const [editTxDate, setEditTxDate] = useState('');
    const [editTxAmount, setEditTxAmount] = useState('');
    const [editTxType, setEditTxType] = useState<'Credit' | 'Debit'>('Debit');
    const [editTxRemarks, setEditTxRemarks] = useState('');
    const [editTxCustom, setEditTxCustom] = useState<Record<string, string>>({});

    const tableRef = useRef<HTMLDivElement>(null);
    const mirrorRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const addRowRef = useRef<HTMLDivElement>(null);
    const [mirrorWidth, setMirrorWidth] = useState(0);
    const [needsScroll, setNeedsScroll] = useState(false);

    const fetchLedgerData = async () => {
        try {
            setLoading(true);
            const resp: { balance: number, is_manual: boolean } = await invoke('get_initial_balance', {
                bankAccountId: account.id,
                targetYear: year,
                targetMonth: month,
            });
            setInitialBalance(resp.balance);
            setInputBalance(resp.balance.toFixed(2));

            const txs: Transaction[] = await invoke('get_transactions', {
                bankAccountId: account.id,
                year,
                month,
            });
            setTransactions(txs);

            // Load custom columns from localStorage
            const cols = localStorage.getItem(`custom_cols_${account.id}`);
            if (cols) {
                const parsed = JSON.parse(cols);
                // Migration: Handle old string array format
                if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
                    const migrated: CustomColumn[] = parsed.map(c => ({ name: c, type: 'text' }));
                    setCustomColumns(migrated);
                    localStorage.setItem(`custom_cols_${account.id}`, JSON.stringify(migrated));
                } else {
                    setCustomColumns(parsed);
                }
            }
        } catch (e) {
            console.error("Failed to load ledger data:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLedgerData();
    }, [account.id, year, month]);

    // Sync mirror scrollbar with table scroll
    useEffect(() => {
        const table = tableRef.current;
        const mirror = mirrorRef.current;
        const header = headerRef.current;
        if (!table || !mirror) return;

        const updateWidth = () => {
            const headerScrollW = headerRef.current?.scrollWidth ?? 0;
            const addRowScrollW = addRowRef.current?.scrollWidth ?? 0;
            const maxScrollW = Math.max(table.scrollWidth, headerScrollW, addRowScrollW);
            setMirrorWidth(maxScrollW);

            // Compare against headerRef because tableRef might have a vertical scrollbar
            // which reduces its clientWidth and causes a false positive.
            const baseClientWidth = headerRef.current?.clientWidth ?? table.clientWidth;
            setNeedsScroll(maxScrollW > baseClientWidth + 2);
        };

        updateWidth();

        const ro = new ResizeObserver(updateWidth);
        ro.observe(table);

        const onTableScroll = () => {
            mirror.scrollLeft = table.scrollLeft;
            if (header) header.scrollLeft = table.scrollLeft;
            if (addRowRef.current) addRowRef.current.scrollLeft = table.scrollLeft;
        };
        const onMirrorScroll = () => {
            table.scrollLeft = mirror.scrollLeft;
            if (header) header.scrollLeft = mirror.scrollLeft;
            if (addRowRef.current) addRowRef.current.scrollLeft = mirror.scrollLeft;
        };

        table.addEventListener('scroll', onTableScroll);
        mirror.addEventListener('scroll', onMirrorScroll);
        return () => {
            table.removeEventListener('scroll', onTableScroll);
            mirror.removeEventListener('scroll', onMirrorScroll);
            ro.disconnect();
        };
    }, [customColumns, transactions]);

    const handleBalanceUpdate = async () => {
        if (inputBalance.trim() === '') {
            // Revert to auto
            await invoke('set_initial_balance', {
                bankAccountId: account.id,
                year,
                month,
                balance: null
            });
        } else {
            const val = parseFloat(inputBalance);
            if (!isNaN(val)) {
                await invoke('set_initial_balance', {
                    bankAccountId: account.id,
                    year,
                    month,
                    balance: val
                });
            } else {
                // If invalid input, reset to what it was
                setInputBalance(initialBalance.toFixed(2));
                return;
            }
        }
        fetchLedgerData();
    };

    const handleBalanceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    const handleAddColumn = () => {
        if (!newColName.trim()) return;
        if (customColumns.some(c => c.name === newColName.trim())) return;

        const col: CustomColumn = {
            name: newColName.trim(),
            type: newColType,
        };

        if (newColType === 'dropdown') {
            col.options = newColOptions.split(',').map(s => s.trim()).filter(s => s.length > 0);
        }

        const newCols = [...customColumns, col];
        setCustomColumns(newCols);
        localStorage.setItem(`custom_cols_${account.id}`, JSON.stringify(newCols));
        setIsAddingCol(false);
        setNewColName('');
        setNewColType('text');
        setNewColOptions('');
    };

    const handleRemoveColumn = async (colName: string) => {
        const confirmed = await showConfirm(`Are you sure you want to delete the column "${colName}"?`);
        if (!confirmed) return;

        const newCols = customColumns.filter(c => c.name !== colName);
        setCustomColumns(newCols);
        localStorage.setItem(`custom_cols_${account.id}`, JSON.stringify(newCols));
    };

    const handleUpdateColumn = (oldName: string) => {
        if (!editColName.trim()) return;
        const updated: CustomColumn = { name: editColName.trim(), type: editColType };
        if (editColType === 'dropdown') {
            updated.options = editColOptions.split(',').map(s => s.trim()).filter(s => s.length > 0);
        }
        const newCols = customColumns.map(c => c.name === oldName ? updated : c);
        setCustomColumns(newCols);
        localStorage.setItem(`custom_cols_${account.id}`, JSON.stringify(newCols));
        setEditingColName(null);
    };

    const handleAddTx = async () => {
        const errors: { date?: boolean; amount?: boolean } = {};
        if (!newTxDate) errors.date = true;
        if (!newTxAmount) errors.amount = true;

        if (Object.keys(errors).length > 0) {
            setTxErrors(errors);
            return;
        }
        setTxErrors({});

        try {
            await invoke('add_transaction', {
                bankAccountId: account.id,
                year,
                month,
                transactionDate: newTxDate,
                amount: parseFloat(newTxAmount),
                transactionType: newTxType,
                remarks: newTxRemarks || null,
                customData: Object.keys(newTxCustom).length > 0 ? JSON.stringify(newTxCustom) : null,
            });
            fetchLedgerData();

            // Reset form
            setNewTxAmount('');
            setNewTxRemarks('');
            setNewTxCustom({});
        } catch (e) {
            console.error("Failed to add tx:", e);
            await showAlert('Failed to add transaction. Error: ' + JSON.stringify(e));
        }
    };

    const handleDeleteTx = async (id: number) => {
        const confirmed = await showConfirm("Delete transaction?");
        if (!confirmed) return;
        try {
            await invoke('delete_transaction', { id });
            fetchLedgerData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdateTx = async (id: number) => {
        if (!editTxDate || !editTxAmount) return;
        try {
            await invoke('update_transaction', {
                id,
                transactionDate: editTxDate,
                amount: parseFloat(editTxAmount),
                transactionType: editTxType,
                remarks: editTxRemarks || null,
                customData: Object.keys(editTxCustom).length > 0 ? JSON.stringify(editTxCustom) : null,
            });
            setEditingTxId(null);
            fetchLedgerData();
        } catch (e) {
            console.error("Failed to update tx:", e);
            await showAlert('Failed to update transaction: ' + JSON.stringify(e));
        }
    };

    const startEditTx = (tx: Transaction) => {
        const customData = tx.custom_data ? JSON.parse(tx.custom_data) : {};
        setEditingTxId(tx.id);
        setEditTxDate(tx.transaction_date);
        setEditTxAmount(tx.amount.toString());
        setEditTxType(tx.transaction_type as 'Credit' | 'Debit');
        setEditTxRemarks(tx.remarks || '');
        setEditTxCustom(customData);
    };

    // Calculate Balances
    const totalCredits = transactions.filter(t => t.transaction_type === 'Credit').reduce((acc, t) => acc + t.amount, 0);
    const totalDebits = transactions.filter(t => t.transaction_type === 'Debit').reduce((acc, t) => acc + t.amount, 0);
    const remainingBalance = initialBalance + totalCredits - totalDebits;

    let runningBalance = initialBalance;

    const minTableWidth = 660 + (customColumns.length * 150);

    if (loading) return <div className="p-4 text-slate-400">Loading {account.name} Ledger...</div>;

    return (
        <div className="flex flex-col h-full bg-transparent">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 glass-panel border-b border-zinc-200 dark:border-zinc-800/80 p-5">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                        <span className="w-2 h-6 rounded-full" style={{ backgroundColor: account.color || '#14b8a6' }}></span>
                        {account.name}
                    </h3>
                    <div className="flex gap-2">
                        {!isAddingCol ? (
                            <button onClick={() => setIsAddingCol(true)} className="text-sm bg-white dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-700/50 text-teal-400 border border-teal-500/30 px-4 py-1.5 rounded-xl transition-all font-medium cursor-pointer">+ Custom Column</button>
                        ) : (
                            <div className="flex items-center gap-2 rounded-xl overflow-hidden border border-zinc-300 dark:border-zinc-700/50 p-1 bg-white dark:bg-zinc-800/30 text-xs">
                                <input
                                    type="text"
                                    value={newColName}
                                    onChange={e => setNewColName(e.target.value)}
                                    placeholder="Col Name"
                                    className="px-2 py-1.5 bg-zinc-100 dark:bg-black/20 text-zinc-900 dark:text-white outline-none w-24 rounded-md placeholder-zinc-500 font-medium"
                                />
                                <select
                                    value={newColType}
                                    onChange={e => setNewColType(e.target.value as any)}
                                    className="bg-zinc-100 dark:bg-black/20 border-none rounded-md px-2 py-1.5 outline-none text-zinc-800 dark:text-zinc-200 cursor-pointer"
                                >
                                    <option className="bg-white dark:bg-zinc-800" value="text">Text</option>
                                    <option className="bg-white dark:bg-zinc-800" value="number">Number</option>
                                    <option className="bg-white dark:bg-zinc-800" value="date">Date</option>
                                    <option className="bg-white dark:bg-zinc-800" value="dropdown">Dropdown</option>
                                </select>

                                {newColType === 'dropdown' && (
                                    <input
                                        type="text"
                                        value={newColOptions}
                                        onChange={e => setNewColOptions(e.target.value)}
                                        placeholder="Option1, Option2"
                                        className="px-2 py-1.5 bg-zinc-100 dark:bg-black/20 text-zinc-900 dark:text-white outline-none w-32 rounded-md placeholder-zinc-500"
                                        onKeyDown={e => e.key === 'Enter' && handleAddColumn()}
                                    />
                                )}

                                <div className="flex items-center px-1">
                                    <button onClick={handleAddColumn} className="bg-teal-600/80 hover:bg-teal-500 text-white px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer mr-1">Save</button>
                                    <button onClick={() => setIsAddingCol(false)} className="bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded text-[11px] transition-colors cursor-pointer">X</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Balances Section */}
                <div className="grid grid-cols-2 gap-4">
                    <div className={`flex flex-col bg-zinc-100 dark:bg-black/20 py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800/50 relative group`}>
                        <div className="flex justify-between items-center w-full">
                            <span className="text-zinc-600 dark:text-zinc-400 font-semibold tracking-[0.1em] text-[10px] uppercase flex items-center gap-1.5">
                                Initial Balance
                            </span>
                            <button
                                onClick={async () => {
                                    const confirmed = await showConfirm({
                                        title: 'Reset Balance',
                                        message: 'Reset initial balance to 0?'
                                    });
                                    if (confirmed) {
                                        await invoke('set_initial_balance', {
                                            bankAccountId: account.id,
                                            year,
                                            month,
                                            balance: 0
                                        });
                                        fetchLedgerData();
                                    }
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-amber-500 cursor-pointer"
                                title="Reset to auto-calculated balance"
                            >
                                <RotateCcw size={11} />
                            </button>
                        </div>
                        <div className="flex items-center mt-1">
                            <span className="text-zinc-500 dark:text-zinc-400 font-mono mr-1 font-bold text-lg">रु</span>
                            <input
                                type="text"
                                value={inputBalance}
                                onChange={e => setInputBalance(e.target.value)}
                                onBlur={handleBalanceUpdate}
                                onKeyDown={handleBalanceKeyDown}
                                className={`bg-transparent outline-none w-full text-xl font-mono font-bold ${initialBalance >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'} transition-all`}
                            />
                            <Edit2 size={12} className="text-zinc-400 opacity-0 group-hover:opacity-100 absolute right-4 transition-opacity pointer-events-none" />
                        </div>
                    </div>

                    <div className="flex flex-col justify-center bg-zinc-100 dark:bg-black/20 py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800/50">
                        <span className="text-zinc-600 dark:text-zinc-400 font-semibold tracking-[0.1em] text-[10px] uppercase mb-1">Remaining Balance</span>
                        <div className="flex items-center">
                            <span className={`text-xl font-mono font-bold ${remainingBalance >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                                रु{remainingBalance.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Column Headers - synced with scrollable body */}
            <div ref={headerRef} className="overflow-hidden flex-shrink-0 px-5 pt-3" style={{ scrollbarWidth: 'none' } as React.CSSProperties}>
                <table className="min-w-full text-left border-collapse text-sm table-fixed" style={{ width: `max(100%, ${minTableWidth}px)` }}>
                    <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800/80 text-zinc-500 uppercase text-[10px] sm:text-xs tracking-[0.1em] font-bold">
                            <th className="pb-3 px-3" style={{ width: 160, minWidth: 160, maxWidth: 160 }}>Date</th>
                            <th className="pb-3 px-3" style={{ width: 110, minWidth: 110, maxWidth: 110 }}>Type</th>
                            <th className="pb-3 px-3" style={{ width: 120, minWidth: 120, maxWidth: 120 }}>Amount</th>
                            <th className="pb-3 px-3" style={{ width: 'auto', minWidth: 200 }}>Remarks</th>
                            {customColumns.map(col => (
                                <th key={col.name} className="pb-3 px-3 group whitespace-nowrap" style={{ width: 150, minWidth: 150, maxWidth: 150 }}>
                                    {editingColName === col.name ? (
                                        <div className="flex items-center gap-1">
                                            <input type="text" value={editColName} onChange={e => setEditColName(e.target.value)} className="bg-zinc-100 dark:bg-black/20 border border-teal-500/50 rounded px-1.5 py-0.5 text-xs text-zinc-900 dark:text-white outline-none w-20" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleUpdateColumn(col.name); if (e.key === 'Escape') setEditingColName(null); }} />
                                            <select value={editColType} onChange={e => setEditColType(e.target.value as any)} className="bg-zinc-100 dark:bg-zinc-800 rounded px-1 py-0.5 text-[10px] outline-none text-zinc-800 dark:text-zinc-200 cursor-pointer normal-case font-normal">
                                                <option value="text">Text</option>
                                                <option value="number">Number</option>
                                                <option value="date">Date</option>
                                                <option value="dropdown">Dropdown</option>
                                            </select>
                                            {editColType === 'dropdown' && (<input type="text" value={editColOptions} onChange={e => setEditColOptions(e.target.value)} placeholder="opt1,opt2" className="bg-zinc-100 dark:bg-black/20 border border-zinc-300 dark:border-zinc-700/50 rounded px-1.5 py-0.5 text-[10px] outline-none w-20 text-zinc-900 dark:text-white normal-case font-normal" />)}
                                            <button onClick={() => handleUpdateColumn(col.name)} className="p-0.5 text-teal-500 hover:text-teal-400 cursor-pointer"><Check size={12} /></button>
                                            <button onClick={() => setEditingColName(null)} className="p-0.5 text-zinc-500 hover:text-zinc-400 cursor-pointer"><X size={12} /></button>
                                        </div>
                                    ) : (
                                        <>
                                            {col.name} <span className="text-[10px] lowercase text-zinc-400 font-normal">({col.type})</span>
                                            <button onClick={() => { setEditingColName(col.name); setEditColName(col.name); setEditColType(col.type); setEditColOptions(col.options?.join(', ') || ''); }} className="ml-1 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-teal-400 cursor-pointer" title="Edit Column"><Edit2 size={12} className="inline" /></button>
                                            <button onClick={() => handleRemoveColumn(col.name)} className="ml-0.5 text-rose-500/70 opacity-0 group-hover:opacity-100 transition-opacity hover:text-rose-400 cursor-pointer" title="Remove Column"><Trash2 size={12} className="inline" /></button>
                                        </>
                                    )}
                                </th>
                            ))}
                            <th className="pb-3 px-3" style={{ width: 70, minWidth: 70, maxWidth: 70 }}></th>
                        </tr>
                    </thead>
                </table>
            </div>

            {/* Add Transaction Row - synced */}
            <div ref={addRowRef} className="overflow-hidden flex-shrink-0 px-5 border-b-2 border-zinc-200 dark:border-zinc-800/80" style={{ scrollbarWidth: 'none' } as React.CSSProperties}>
                <table className="min-w-full text-left border-collapse text-sm table-fixed" style={{ width: `max(100%, ${minTableWidth}px)` }}>
                    <tbody>
                        <tr className="bg-white dark:bg-zinc-800/20">
                            <td className="py-3 px-3" style={{ width: 160, minWidth: 160, maxWidth: 160 }}>
                                <input type="date" value={newTxDate} onChange={e => { setNewTxDate(e.target.value); setTxErrors(prev => ({ ...prev, date: false })); }} className={`bg-zinc-100 dark:bg-black/20 border rounded-lg px-3 py-2 outline-none text-zinc-800 dark:text-zinc-200 w-full focus:ring-1 focus:ring-teal-500/50 transition-all font-mono text-xs ${txErrors.date ? 'border-rose-500 focus:border-rose-500' : 'border-zinc-300 dark:border-zinc-700/50 focus:border-teal-500/50'}`} />
                            </td>
                            <td className="py-3 px-3" style={{ width: 110, minWidth: 110, maxWidth: 110 }}>
                                <select value={newTxType} onChange={e => setNewTxType(e.target.value as 'Credit' | 'Debit')} className="bg-zinc-100 dark:bg-black/20 border border-zinc-300 dark:border-zinc-700/50 rounded-lg px-3 py-2 outline-none text-zinc-800 dark:text-zinc-200 w-full focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all font-medium text-xs cursor-pointer">
                                    <option className="bg-white dark:bg-zinc-800" value="Debit">Debit</option>
                                    <option className="bg-white dark:bg-zinc-800" value="Credit">Credit</option>
                                </select>
                            </td>
                            <td className="py-3 px-3" style={{ width: 120, minWidth: 120, maxWidth: 120 }}>
                                <input type="number" step="0.01" placeholder="0.00" value={newTxAmount} onChange={e => { setNewTxAmount(e.target.value); setTxErrors(prev => ({ ...prev, amount: false })); }} onKeyDown={e => e.key === 'Enter' && handleAddTx()} className={`bg-zinc-100 dark:bg-black/20 border rounded-lg px-3 py-2 outline-none text-zinc-800 dark:text-zinc-200 w-full text-left focus:ring-1 focus:ring-teal-500/50 transition-all font-mono text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${txErrors.amount ? 'border-rose-500 focus:border-rose-500' : 'border-zinc-300 dark:border-zinc-700/50 focus:border-teal-500/50'}`} />
                            </td>
                            <td className="py-3 px-3" style={{ width: 'auto', minWidth: 200 }}>
                                <input type="text" placeholder="Add remarks..." value={newTxRemarks} onChange={e => setNewTxRemarks(e.target.value)} className="bg-zinc-100 dark:bg-black/20 border border-zinc-300 dark:border-zinc-700/50 rounded-lg px-3 py-2 outline-none text-zinc-800 dark:text-zinc-200 w-full focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all placeholder-zinc-600 text-xs" />
                            </td>
                            {customColumns.map(col => (
                                <td key={col.name} className="py-3 px-3" style={{ width: 150, minWidth: 150, maxWidth: 150 }}>
                                    {col.type === 'dropdown' ? (
                                        <select value={newTxCustom[col.name] || ''} onChange={e => setNewTxCustom({ ...newTxCustom, [col.name]: e.target.value })} className="bg-zinc-100 dark:bg-black/20 border border-zinc-300 dark:border-zinc-700/50 rounded-lg px-2 py-2 outline-none text-zinc-800 dark:text-zinc-200 w-full focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all text-xs min-w-[100px]">
                                            <option className="bg-white dark:bg-zinc-800" value="">Select...</option>
                                            {col.options?.map(opt => (<option className="bg-white dark:bg-zinc-800" key={opt} value={opt}>{opt}</option>))}
                                        </select>
                                    ) : col.type === 'date' ? (
                                        <input type="date" value={newTxCustom[col.name] || ''} onChange={e => setNewTxCustom({ ...newTxCustom, [col.name]: e.target.value })} className="bg-zinc-100 dark:bg-black/20 border border-zinc-300 dark:border-zinc-700/50 rounded-lg px-2 py-2 outline-none text-zinc-800 dark:text-zinc-200 w-full focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all text-xs" />
                                    ) : (
                                        <input type={col.type === 'number' ? 'number' : 'text'} placeholder={col.name} value={newTxCustom[col.name] || ''} onChange={e => setNewTxCustom({ ...newTxCustom, [col.name]: e.target.value })} className="bg-zinc-100 dark:bg-black/20 border border-zinc-300 dark:border-zinc-700/50 rounded-lg px-3 py-2 outline-none text-zinc-800 dark:text-zinc-200 w-full focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all placeholder-zinc-600 text-xs" />
                                    )}
                                </td>
                            ))}
                            <td className="py-3 px-3 text-center" style={{ width: 70, minWidth: 70, maxWidth: 70 }}>
                                <button onClick={handleAddTx} className="bg-teal-600 hover:bg-teal-500 text-white p-2 rounded-lg transition-all hover:-translate-y-0.5 cursor-pointer"><Plus size={16} /></button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Mirror scrollbar - always in DOM so ref is valid; hidden via height when not needed */}
            <div
                ref={mirrorRef}
                className="overflow-x-auto custom-scrollbar flex-shrink-0 mx-5 transition-all duration-200"
                style={{ height: needsScroll ? '12px' : '0px', opacity: needsScroll ? 1 : 0 }}
            >
                <div style={{ width: mirrorWidth, height: 1 }} />
            </div>

            {/* Existing Transactions - scrollable, native scrollbar hidden */}
            <div ref={tableRef} className="flex-1 no-x-scrollbar p-5 pt-1 relative">
                <table className="min-w-full text-left border-collapse text-sm table-fixed" style={{ width: `max(100%, ${minTableWidth}px)` }}>
                    <tbody className="divide-y divide-zinc-800/40">
                        {/* List Transactions */}
                        {transactions.map(tx => {
                            const amount = tx.transaction_type === 'Credit' ? tx.amount : -tx.amount;
                            runningBalance += amount;
                            const customData = tx.custom_data ? JSON.parse(tx.custom_data) : {};

                            if (editingTxId === tx.id) {
                                return (
                                    <tr key={tx.id} className="bg-teal-500/5 dark:bg-teal-900/10 border-l-2 border-teal-500/50">
                                        <td className="py-2 px-2">
                                            <input type="date" value={editTxDate} onChange={e => setEditTxDate(e.target.value)} className="bg-zinc-100 dark:bg-black/30 border border-teal-500/50 rounded-lg px-2 py-1.5 outline-none text-zinc-800 dark:text-zinc-200 w-full font-mono text-xs" />
                                        </td>
                                        <td className="py-2 px-2">
                                            <select value={editTxType} onChange={e => setEditTxType(e.target.value as 'Credit' | 'Debit')} className="bg-zinc-100 dark:bg-zinc-800 border border-teal-500/50 rounded-lg px-2 py-1.5 outline-none text-zinc-800 dark:text-zinc-200 w-full text-xs cursor-pointer">
                                                <option className="bg-white dark:bg-zinc-800" value="Debit">Debit</option>
                                                <option className="bg-white dark:bg-zinc-800" value="Credit">Credit</option>
                                            </select>
                                        </td>
                                        <td className="py-2 px-2">
                                            <input type="number" step="0.01" value={editTxAmount} onChange={e => setEditTxAmount(e.target.value)} className="bg-zinc-100 dark:bg-black/30 border border-teal-500/50 rounded-lg px-2 py-1.5 outline-none text-zinc-800 dark:text-zinc-200 w-full text-right font-mono text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                        </td>
                                        <td className="py-2 px-2">
                                            <input type="text" value={editTxRemarks} onChange={e => setEditTxRemarks(e.target.value)} className="bg-zinc-100 dark:bg-black/30 border border-teal-500/50 rounded-lg px-2 py-1.5 outline-none text-zinc-800 dark:text-zinc-200 w-full text-xs" placeholder="Remarks..." />
                                        </td>
                                        {customColumns.map(col => (
                                            <td key={col.name} className="py-2 px-2">
                                                <input type="text" value={editTxCustom[col.name] || ''} onChange={e => setEditTxCustom({ ...editTxCustom, [col.name]: e.target.value })} className="bg-zinc-100 dark:bg-black/30 border border-teal-500/50 rounded-lg px-2 py-1.5 outline-none text-zinc-800 dark:text-zinc-200 w-full text-xs" placeholder={col.name} />
                                            </td>
                                        ))}
                                        <td className="py-2 px-2 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => handleUpdateTx(tx.id)} className="p-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-md cursor-pointer transition-colors"><Check size={12} /></button>
                                                <button onClick={() => setEditingTxId(null)} className="p-1.5 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-600 dark:text-zinc-300 rounded-md cursor-pointer transition-colors"><X size={12} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }

                            return (
                                <tr key={tx.id} className="hover:bg-white dark:bg-zinc-800/40 transition-colors group">
                                    <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400 font-mono text-xs" style={{ width: 160, minWidth: 160, maxWidth: 160 }}>{tx.transaction_date}</td>
                                    <td className="py-3 px-3" style={{ width: 110, minWidth: 110, maxWidth: 110 }}>
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider border ${tx.transaction_type === 'Credit' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                            {tx.transaction_type}
                                        </span>
                                    </td>
                                    <td className={`py-3 px-3 text-left font-mono text-sm ${tx.transaction_type === 'Credit' ? 'text-emerald-400' : 'text-zinc-800 dark:text-zinc-200'}`} style={{ width: 120, minWidth: 120, maxWidth: 120 }}>
                                        {tx.transaction_type === 'Credit' ? '+' : ''}रु{tx.amount.toFixed(2)}
                                    </td>

                                    <td className="py-3 px-3 text-zinc-700 dark:text-zinc-300 truncate max-w-[200px]" style={{ width: 'auto', minWidth: 200 }}>{tx.remarks}</td>

                                    {customColumns.map(col => (
                                        <td key={col.name} className="py-3 px-3 text-zinc-500 text-sm truncate max-w-[150px]" style={{ width: 150, minWidth: 150, maxWidth: 150 }}>
                                            {customData[col.name] || <span className="text-zinc-700/50">-</span>}
                                        </td>
                                    ))}

                                    <td className="py-3 px-3 text-center" style={{ width: 70, minWidth: 70, maxWidth: 70 }}>
                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => startEditTx(tx)} className="text-zinc-500 hover:text-teal-400 p-1 bg-zinc-100 dark:bg-black/20 hover:bg-teal-500/10 rounded-md border border-transparent hover:border-teal-500/20 cursor-pointer"><Edit2 size={13} /></button>
                                            <button onClick={() => handleDeleteTx(tx.id)} className="text-zinc-600 hover:text-rose-400 p-1 bg-zinc-100 dark:bg-black/20 hover:bg-rose-500/10 rounded-md border border-transparent hover:border-rose-500/20 cursor-pointer"><Trash2 size={13} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
