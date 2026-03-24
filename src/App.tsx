import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { trackEvent } from "@aptabase/tauri";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { Navigation } from "./components/Navigation";
import { Sidebar } from "./components/Sidebar";
import { BankAccount } from "./types";
import { LedgerTable } from "./components/LedgerTable";
import { useDialog } from "./components/DialogProvider";
import { Theme } from "./components/ThemeSelector";
import { FirstTimeSetup } from "./components/FirstTimeSetup";
import { OnboardingTour } from "./components/OnboardingTour";

export default function App() {
  const { showAlert, showConfirm } = useDialog();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [theme, setTheme] = useState<Theme>('system');
  const [showSetup, setShowSetup] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [userName, setUserName] = useState('');

  const [systemCurrency, setSystemCurrency] = useState<string>('NPR');

  // Track app launch and check for updates
  useEffect(() => {
    trackEvent("app_started");

    // Check for updates silently on launch
    check().then(update => {
      if (update?.available) {
        const msg = `A new version (${update.version}) is available!\n\nWould you like to download and install it now? The app will restart automatically.`;
        if (window.confirm(msg)) {
          update.downloadAndInstall().then(() => relaunch());
        }
      }
    }).catch(() => {
      // Silently ignore update check failures (e.g., no internet)
    });
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      let effectiveTheme = theme;

      if (theme === 'system') {
        effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }

      if (effectiveTheme === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Global Navigation State
  const [years, setYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [months, setMonths] = useState<number[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [monthType, setMonthType] = useState<'Nepali' | 'English'>('Nepali');

  const fetchAccounts = async () => {
    try {
      const accs: BankAccount[] = await invoke('get_bank_accounts');
      setAccounts(accs);
    } catch (e) {
      console.error("Failed to load bank accounts", e);
    }
  };

  const fetchYears = async () => {
    try {
      const fetchedYears: string[] = await invoke('get_years');

      setYears(fetchedYears);

      // Deselect if current selected year was deleted, or select first if none selected
      if (!selectedYear && fetchedYears.length > 0) {
        setSelectedYear(fetchedYears[0]);
      } else if (selectedYear && !fetchedYears.includes(selectedYear)) {
        setSelectedYear(fetchedYears.length > 0 ? fetchedYears[0] : null);
      }
    } catch (e) {
      console.error("Failed to load years", e);
      await showAlert("Failed to load years: " + JSON.stringify(e));
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchYears();

    // Default to first month (Baishakh)
    setMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    setSelectedMonth(1);

    // Load settings
    (async () => {
      try {
        const [name, storedTheme, storedCurrency, tourCompleted] = await Promise.all([
          invoke('get_setting', { key: 'user_name' }) as Promise<string | null>,
          invoke('get_setting', { key: 'theme' }) as Promise<string | null>,
          invoke('get_setting', { key: 'system_currency' }) as Promise<string | null>,
          invoke('get_setting', { key: 'has_completed_tour' }) as Promise<string | null>
        ]);

        if (name) {
          setUserName(name);
        }

        if (storedTheme) {
          setTheme(storedTheme as Theme);
        }

        if (storedCurrency) {
          setSystemCurrency(storedCurrency);
        }

        // Check if we need setup
        if (!name || !storedTheme) {
          setShowSetup(true);
        } else if (!tourCompleted) {
          setShowTour(true);
        }
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    })();
  }, []);

  const handleSetupComplete = async (name: string, selectedTheme: Theme, selectedCurrency: string) => {
    try {
      setUserName(name);
      setTheme(selectedTheme);
      setSystemCurrency(selectedCurrency);
      setShowSetup(false);
      setShowTour(true); // Show tour immediately after setup
      trackEvent("setup_completed", { theme: selectedTheme, currency: selectedCurrency });
      await Promise.all([
        invoke('set_setting', { key: 'user_name', value: name }),
        invoke('set_setting', { key: 'theme', value: selectedTheme }),
        invoke('set_setting', { key: 'system_currency', value: selectedCurrency })
      ]);
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  };

  const handleTourComplete = async () => {
    setShowTour(false);
    try {
      await invoke('set_setting', { key: 'has_completed_tour', value: 'true' });
      trackEvent("tour_completed");
    } catch (e) {
      console.error('Failed to save tour completion', e);
    }
  };

  const handleUpdateTheme = async (newTheme: Theme) => {
    setTheme(newTheme);
    try {
      await invoke('set_setting', { key: 'theme', value: newTheme });
    } catch (e) {
      console.error('Failed to save theme setting', e);
    }
  };

  const handleUpdateUserName = async (newName: string) => {
    setUserName(newName);
    try {
      await invoke('set_setting', { key: 'user_name', value: newName });
    } catch (e) {
      console.error('Failed to save username', e);
    }
  };

  const handleUpdateSystemCurrency = async (newCurrency: string) => {
    if (newCurrency === systemCurrency) return;

    const confirmed = await showConfirm({
      title: 'Change System Currency',
      message: `Are you sure you want to change the system currency from ${systemCurrency} to ${newCurrency}? \n\nThis will convert ALL existing transaction amounts and balances using the real-time exchange rate. This action cannot be undone.`,
    });

    if (confirmed) {
      try {
        showAlert("Converting currency... Please wait.");
        const rate: number = await invoke('convert_currency_data', {
          fromCurrency: systemCurrency,
          toCurrency: newCurrency
        });

        setSystemCurrency(newCurrency);
        await invoke('set_setting', { key: 'system_currency', value: newCurrency });
        
        await showAlert(`Currency converted successfully! (Rate: 1 ${systemCurrency} = ${rate.toFixed(4)} ${newCurrency})`);
        
        // Refresh data
        fetchAccounts();
        fetchYears();
      } catch (e) {
        console.error('Failed to convert currency', e);
        await showAlert('Failed to convert currency: ' + JSON.stringify(e));
      }
    }
  };

  const handleReset = async () => {
    const confirmed = await showConfirm({
      title: 'Factory Reset',
      message: 'This will permanently delete ALL your data, accounts, and settings. Are you sure you want to proceed?',
    });

    if (confirmed) {
      try {
        await invoke('reset_application');
        // Reset local state
        setAccounts([]);
        setYears([]);
        setSelectedYear(null);
        setSelectedMonth(new Date().getMonth() + 1);
        setUserName('');
        setTheme('system');
        setShowSetup(true);
      } catch (e) {
        console.error('Failed to reset application', e);
        await showAlert('Failed to reset: ' + JSON.stringify(e));
      }
    }
  };

  const handleAddYear = async (y: string) => {
    try {
      await invoke('add_year', { year: y });
      fetchYears();
    } catch (e) {
      console.error("Failed to add year", e);
      await showAlert("Failed to add year: " + JSON.stringify(e));
    }
  };

  const handleUpdateYear = async (oldYear: string, newYear: string) => {
    try {
      await invoke('update_year', { oldYear, newYear });
      fetchYears();
      if (selectedYear === oldYear) {
        setSelectedYear(newYear);
      }
    } catch (e) {
      console.error("Failed to update year", e);
      await showAlert("Failed to update year. Ensure it does not already exist. " + JSON.stringify(e));
    }
  };

  const handleDeleteYear = async (y: string) => {
    try {
      const confirmed = await showConfirm(`Are you sure you want to delete the year ${y}? All dependent data will be destroyed.`);
      if (!confirmed) return;
      await invoke('delete_year', { year: y });
      if (selectedYear === y) {
        setSelectedYear(null);
      }
      fetchYears();
    } catch (e) {
      console.error("Failed to delete year", e);
      await showAlert("Failed to delete year: " + JSON.stringify(e));
    }
  };

  const handleAddAccount = async (name: string, color: string) => {
    try {
      await invoke('add_bank_account', { name, color });
      trackEvent("account_added");
      fetchAccounts();
    } catch (e) {
      console.error("Failed to add account", e);
      await showAlert("Failed to add account. Ensure name is unique. " + JSON.stringify(e));
    }
  };

  const handleUpdateAccount = async (id: number, name: string, color?: string) => {
    try {
      await invoke('update_bank_account', { id, name, color });
      fetchAccounts();
    } catch (e) {
      console.error("Failed to update account", e);
      await showAlert("Failed to update account name. Ensure it is unique.");
    }
  };

  const handleDeleteAccount = async (id: number) => {
    try {
      const confirmed = await showConfirm("Are you sure you want to delete this bank account? All transactions will be permanently lost.");
      if (!confirmed) return;

      await invoke('delete_bank_account', { id });
      fetchAccounts();
    } catch (e) {
      console.error("Failed to delete account", e);
    }
  };

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden text-zinc-800 dark:text-zinc-200 selection:bg-teal-500/30">
      <Sidebar
        years={years}
        selectedYear={selectedYear}
        onSelectYear={setSelectedYear}
        onAddYear={handleAddYear}
        onUpdateYear={handleUpdateYear}
        onDeleteYear={handleDeleteYear}
        accounts={accounts}
        onAddAccount={handleAddAccount}
        onUpdateAccount={handleUpdateAccount}
        onDeleteAccount={handleDeleteAccount}
        userName={userName}
        theme={theme}
        systemCurrency={systemCurrency}
      />

      <div className="flex-1 flex flex-col min-w-0 relative">
        <Navigation
          months={months}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
          selectedYear={selectedYear}
          theme={theme}
          onThemeChange={handleUpdateTheme}
          monthType={monthType}
          onToggleMonthType={() => setMonthType(prev => prev === 'Nepali' ? 'English' : 'Nepali')}
          userName={userName}
          onUpdateUserName={handleUpdateUserName}
          onReset={handleReset}
          systemCurrency={systemCurrency}
          onUpdateSystemCurrency={handleUpdateSystemCurrency}
        />

        <div className="flex-1 overflow-hidden flex bg-white dark:bg-zinc-900">
          {accounts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.05)_0,transparent_50%)] pointer-events-none"></div>
              <p className="text-xl font-medium tracking-wide text-zinc-700 dark:text-zinc-300">No bank accounts configured</p>
              <p className="text-sm mt-2 mb-8 text-zinc-500">Add an account to start tracking your finances</p>
              <div className="bg-teal-600/10 text-teal-700 dark:text-teal-400 px-6 py-2 rounded-xl border border-teal-600/20 font-medium">
                Click "+ Add New" in the sidebar
              </div>
            </div>
          ) : !selectedYear || !selectedMonth ? (
            <div className="flex-1 flex items-center justify-center text-zinc-500">
              <div className="glass-panel px-8 py-6 rounded-2xl flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-white dark:bg-zinc-800/80 flex items-center justify-center mb-4 border border-zinc-300 dark:border-zinc-700/50">
                  <span className="text-2xl opacity-50">📅</span>
                </div>
                <p className="font-medium text-zinc-700 dark:text-zinc-300">Timeline Not Selected</p>
                <p className="text-sm mt-1">Please select a Year and Month to view ledgers.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto flex custom-scrollbar bg-zinc-100 dark:bg-zinc-950/50 relative">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className={`flex-shrink-0 flex flex-col h-full bg-white dark:bg-zinc-900 border-r-2 border-zinc-300 dark:border-zinc-600/30 min-w-0 overflow-hidden`}
                  style={{ width: accounts.length === 1 ? '100%' : '50%', minWidth: accounts.length > 2 ? '50%' : undefined }}
                >
                  <div
                    className="border-b border-zinc-200 dark:border-zinc-800/80 p-3 flex items-center justify-center relative z-10"
                    style={{ backgroundColor: `${acc.color || '#14b8a6'}22` }}
                  >
                    <span
                      className="text-xs font-bold tracking-[0.15em] uppercase"
                      style={{ color: acc.color || '#14b8a6' }}
                    >
                      {acc.name}
                    </span>
                  </div>
                  <div className="flex-1 overflow-hidden relative">
                    <LedgerTable
                      key={`${acc.id}-${selectedYear}-${selectedMonth}-${systemCurrency}`}
                      account={acc}
                      year={selectedYear}
                      month={selectedMonth}
                      systemCurrency={systemCurrency}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {showSetup && (
        <FirstTimeSetup onComplete={handleSetupComplete} />
      )}
      {showTour && !showSetup && (
        <OnboardingTour userName={userName} onComplete={handleTourComplete} />
      )}
    </div>
  );
}
