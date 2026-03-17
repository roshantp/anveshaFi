pub use rusqlite::{Connection, Result};
use std::fs;
use tauri::{AppHandle, Manager};

pub fn init_db(app: &AppHandle) -> Result<Connection, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    }

    let db_path = app_dir.join("budget_tracker_v2.db");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    // Create Bank Accounts table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS bank_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            color TEXT
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // Attempt to migrate existing databases to include the color column
    let _ = conn.execute("ALTER TABLE bank_accounts ADD COLUMN color TEXT", []);

    // Create Years table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS years (
            year_value TEXT PRIMARY KEY
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // Create Transactions table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bank_account_id INTEGER NOT NULL,
            year TEXT NOT NULL,
            month INTEGER NOT NULL,
            transaction_date TEXT NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL,
            remarks TEXT,
            custom_data TEXT,
            FOREIGN KEY(bank_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE,
            FOREIGN KEY(year) REFERENCES years(year_value) ON UPDATE CASCADE ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // Create Monthly Balances table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS monthly_balances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bank_account_id INTEGER NOT NULL,
            year TEXT NOT NULL,
            month INTEGER NOT NULL,
            balance REAL NOT NULL,
            UNIQUE(bank_account_id, year, month),
            FOREIGN KEY(bank_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE,
            FOREIGN KEY(year) REFERENCES years(year_value) ON UPDATE CASCADE ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // Create Settings table (key-value store for app preferences)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON;", []).map_err(|e| e.to_string())?;

    Ok(conn)
}
