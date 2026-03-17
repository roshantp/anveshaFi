use crate::models::{BankAccount, Transaction, InitialBalanceResponse};
use crate::AppState;
use rusqlite::params;
use tauri::State;

// --- Settings ---
#[tauri::command]
pub fn get_setting(state: State<AppState>, key: String) -> Result<Option<String>, String> {
    let db = state.db.lock().unwrap();
    let mut stmt = db.prepare("SELECT value FROM settings WHERE key = ?1").map_err(|e| e.to_string())?;
    let result: Option<String> = stmt.query_row(params![key], |row| row.get(0)).ok();
    Ok(result)
}

#[tauri::command]
pub fn set_setting(state: State<AppState>, key: String, value: String) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    db.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// --- Bank Accounts ---
#[tauri::command]
pub fn get_bank_accounts(state: State<AppState>) -> Result<Vec<BankAccount>, String> {
    let db = state.db.lock().unwrap();
    let mut stmt = db.prepare("SELECT id, name, color FROM bank_accounts").map_err(|e| e.to_string())?;
    let account_iter = stmt.query_map([], |row| {
        Ok(BankAccount {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2).ok().unwrap_or(None),
        })
    }).map_err(|e| e.to_string())?;

    let mut accounts = Vec::new();
    for account in account_iter {
        accounts.push(account.map_err(|e| e.to_string())?);
    }
    Ok(accounts)
}

#[tauri::command]
pub fn add_bank_account(state: State<AppState>, name: String, color: Option<String>) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    let default_color = Some("#14b8a6".to_string());
    
    db.execute(
        "INSERT INTO bank_accounts (name, color) VALUES (?1, ?2)",
        params![name, color.or(default_color)],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_bank_account(state: State<AppState>, id: i64, name: String, color: Option<String>) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    db.execute(
        "UPDATE bank_accounts SET name = ?1, color = ?2 WHERE id = ?3",
        params![name, color, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_bank_account(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    db.execute("DELETE FROM bank_accounts WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// --- Transactions ---
#[tauri::command]
pub fn get_transactions(
    state: State<AppState>,
    bank_account_id: i64,
    year: String,
    month: i64,
) -> Result<Vec<Transaction>, String> {
    let db = state.db.lock().unwrap();
    let mut stmt = db.prepare(
        "SELECT id, bank_account_id, year, month, transaction_date, amount, type, remarks, custom_data 
         FROM transactions WHERE bank_account_id = ?1 AND year = ?2 AND month = ?3 
         ORDER BY transaction_date ASC, id ASC"
    ).map_err(|e| e.to_string())?;

    let iter = stmt.query_map(params![bank_account_id, year, month], |row| {
        Ok(Transaction {
            id: row.get(0)?,
            bank_account_id: row.get(1)?,
            year: row.get(2)?,
            month: row.get(3)?,
            transaction_date: row.get(4)?,
            amount: row.get(5)?,
            transaction_type: row.get(6)?,
            remarks: row.get(7)?,
            custom_data: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut txs = Vec::new();
    for tx in iter {
        txs.push(tx.map_err(|e| e.to_string())?);
    }
    Ok(txs)
}

#[tauri::command]
pub fn add_transaction(
    state: State<AppState>,
    bank_account_id: i64,
    year: String,
    month: i64,
    transaction_date: String,
    amount: f64,
    transaction_type: String,
    remarks: Option<String>,
    custom_data: Option<String>,
) -> Result<i64, String> {
    let db = state.db.lock().unwrap();
    db.execute(
        "INSERT INTO transactions (bank_account_id, year, month, transaction_date, amount, type, remarks, custom_data) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![bank_account_id, year, month, transaction_date, amount, transaction_type, remarks, custom_data],
    ).map_err(|e| e.to_string())?;
    Ok(db.last_insert_rowid())
}

#[tauri::command]
pub fn update_transaction(
    state: State<AppState>,
    id: i64,
    transaction_date: String,
    amount: f64,
    transaction_type: String,
    remarks: Option<String>,
    custom_data: Option<String>,
) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    db.execute(
        "UPDATE transactions SET transaction_date = ?1, amount = ?2, type = ?3, remarks = ?4, custom_data = ?5 WHERE id = ?6",
        params![transaction_date, amount, transaction_type, remarks, custom_data, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_transaction(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    db.execute("DELETE FROM transactions WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// --- Rollover Balance ---
#[tauri::command]
pub fn get_initial_balance(
    state: State<AppState>,
    bank_account_id: i64,
    target_year: String,
    target_month: i64,
) -> Result<InitialBalanceResponse, String> {
    let db = state.db.lock().unwrap();
    
    // 1. Check if there's an explicit manual balance for this exact month
    let manual_balance: Option<f64> = db.query_row(
        "SELECT balance FROM monthly_balances WHERE bank_account_id = ?1 AND year = ?2 AND month = ?3",
        params![bank_account_id, target_year, target_month],
        |row| row.get(0),
    ).ok();

    if let Some(bal) = manual_balance {
        return Ok(InitialBalanceResponse {
            balance: bal,
            is_manual: true,
        });
    }

    // 2. If not, find the most recent manual balance BEFORE this month
    let latest_manual: Option<(String, i64, f64)> = db.query_row(
        "SELECT year, month, balance FROM monthly_balances 
         WHERE bank_account_id = ?1 AND (year < ?2 OR (year = ?2 AND month < ?3))
         ORDER BY year DESC, month DESC LIMIT 1",
        params![bank_account_id, target_year, target_month],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    ).ok();

    let (start_year, start_month, mut running_balance) = match latest_manual {
        Some((y, m, b)) => (y, m, b),
        None => ("".to_string(), 0, 0.0), // Start from the beginning of time
    };

    // 3. Sum up all transactions between the start point and the target month
    let credits: f64 = db.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM transactions 
         WHERE bank_account_id = ?1 AND type = 'Credit' 
         AND (
             (year > ?2 OR (year = ?2 AND month >= ?3))
             AND 
             (year < ?4 OR (year = ?4 AND month < ?5))
         )",
        params![bank_account_id, start_year, start_month, target_year, target_month],
        |row| row.get(0),
    ).unwrap_or(0.0);

    let debits: f64 = db.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM transactions 
         WHERE bank_account_id = ?1 AND type = 'Debit' 
         AND (
             (year > ?2 OR (year = ?2 AND month >= ?3))
             AND 
             (year < ?4 OR (year = ?4 AND month < ?5))
         )",
        params![bank_account_id, start_year, start_month, target_year, target_month],
        |row| row.get(0),
    ).unwrap_or(0.0);

    running_balance += credits - debits;

    Ok(InitialBalanceResponse {
        balance: running_balance,
        is_manual: false,
    })
}

#[tauri::command]
pub fn set_initial_balance(
    state: State<AppState>,
    bank_account_id: i64,
    year: String,
    month: i64,
    balance: Option<f64>,
) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    if let Some(bal) = balance {
        db.execute(
            "INSERT INTO monthly_balances (bank_account_id, year, month, balance) 
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(bank_account_id, year, month) DO UPDATE SET balance = excluded.balance",
            params![bank_account_id, year, month, bal],
        ).map_err(|e| e.to_string())?;
    } else {
        db.execute(
            "DELETE FROM monthly_balances WHERE bank_account_id = ?1 AND year = ?2 AND month = ?3",
            params![bank_account_id, year, month],
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// --- Years ---
#[tauri::command]
pub fn get_years(state: State<AppState>) -> Result<Vec<String>, String> {
    let db = state.db.lock().unwrap();
    let mut stmt = db.prepare("SELECT year_value FROM years ORDER BY year_value ASC").map_err(|e| e.to_string())?;
    
    let year_iter = stmt.query_map([], |row| row.get(0)).map_err(|e| e.to_string())?;
    let mut years = Vec::new();
    for year in year_iter {
        years.push(year.map_err(|e| e.to_string())?);
    }
    Ok(years)
}

#[tauri::command]
pub fn add_year(state: State<AppState>, year: String) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    // Use INSERT OR IGNORE in case it exists
    db.execute(
        "INSERT OR IGNORE INTO years (year_value) VALUES (?1)",
        params![year],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_year(state: State<AppState>, old_year: String, new_year: String) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    // Due to ON UPDATE CASCADE, this will ripple through transactions and monthly_balances
    db.execute(
        "UPDATE years SET year_value = ?1 WHERE year_value = ?2",
        params![new_year, old_year],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_year(state: State<AppState>, year: String) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    // Due to ON DELETE CASCADE, this deletes linked transactions and monthly_balances
    db.execute(
        "DELETE FROM years WHERE year_value = ?1",
        params![year],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// --- Export ---
fn fetch_transactions_as_csv(
    db: &rusqlite::Connection,
    bank_account_id: Option<i64>,
    year: Option<&str>,
    month: Option<i64>,
) -> Result<String, String> {
    let mut conditions = vec!["1=1".to_string()];
    if let Some(id) = bank_account_id {
        conditions.push(format!("t.bank_account_id = {}", id));
    }
    if let Some(y) = year {
        conditions.push(format!("t.year = '{}'", y.replace('\'', "''")));
    }
    if let Some(m) = month {
        conditions.push(format!("t.month = {}", m));
    }
    let where_clause = conditions.join(" AND ");
    
    let query = format!(
        "SELECT b.name, t.year, t.month, t.transaction_date, t.type, t.amount, t.remarks
         FROM transactions t JOIN bank_accounts b ON t.bank_account_id = b.id
         WHERE {} ORDER BY t.year, t.month, t.transaction_date, t.id",
        where_clause
    );
    
    let mut stmt = db.prepare(&query).map_err(|e| e.to_string())?;
    let mut csv = String::from("Account,Year,Month,Date,Type,Amount,Remarks\n");
    
    let rows = stmt.query_map([], |row| {
        let acct: String = row.get(0)?;
        let yr: String = row.get(1)?;
        let mo: i64 = row.get(2)?;
        let date: String = row.get(3)?;
        let txtype: String = row.get(4)?;
        let amount: f64 = row.get(5)?;
        let remarks: Option<String> = row.get(6)?;
        Ok((acct, yr, mo, date, txtype, amount, remarks))
    }).map_err(|e| e.to_string())?;
    
    for row in rows {
        let (acct, yr, mo, date, txtype, amount, remarks) = row.map_err(|e| e.to_string())?;
        let remarks_str = remarks.unwrap_or_default().replace('"', "\"\"");
        csv.push_str(&format!(
            "\"{}\",\"{}\",{},{},{},{:.2},\"{}\"\n",
            acct, yr, mo, date, txtype, amount, remarks_str
        ));
    }
    Ok(csv)
}

#[tauri::command]
pub fn export_year_csv(state: State<AppState>, year: String) -> Result<String, String> {
    let csv = {
        let db = state.db.lock().unwrap();
        fetch_transactions_as_csv(&db, None, Some(&year), None)?
    };
    let path = rfd::FileDialog::new()
        .set_file_name(&format!("anveshaFi_{}.csv", year.replace('/', "-")))
        .add_filter("CSV", &["csv"])
        .save_file();
    
    match path {
        Some(p) => {
            std::fs::write(&p, &csv).map_err(|e| e.to_string())?;
            Ok(format!("Exported to {}", p.display()))
        }
        None => Err("Export cancelled".to_string()),
    }
}

#[tauri::command]
pub fn export_month_csv(state: State<AppState>, year: String, month: i64, month_type: String) -> Result<String, String> {
    let month_name = if month_type == "Nepali" {
        match month {
            1 => "Baishakh", 2 => "Jestha", 3 => "Ashadh", 4 => "Shrawan",
            5 => "Bhadra", 6 => "Ashwin", 7 => "Kartik", 8 => "Mangsir",
            9 => "Poush", 10 => "Magh", 11 => "Falgun", 12 => "Chaitra",
            _ => "Month",
        }
    } else {
        match month {
            1 => "Jan", 2 => "Feb", 3 => "Mar", 4 => "Apr",
            5 => "May", 6 => "Jun", 7 => "Jul", 8 => "Aug",
            9 => "Sep", 10 => "Oct", 11 => "Nov", 12 => "Dec",
            _ => "Month",
        }
    };
    let csv = {
        let db = state.db.lock().unwrap();
        fetch_transactions_as_csv(&db, None, Some(&year), Some(month))?
    };
    let path = rfd::FileDialog::new()
        .set_file_name(&format!("anveshaFi_{}_{}.csv", year.replace('/', "-"), month_name))
        .add_filter("CSV", &["csv"])
        .save_file();
    
    match path {
        Some(p) => {
            std::fs::write(&p, &csv).map_err(|e| e.to_string())?;
            Ok(format!("Exported to {}", p.display()))
        }
        None => Err("Export cancelled".to_string()),
    }
}
#[tauri::command]
pub fn reset_application(state: State<AppState>) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    
    // Disable foreign keys temporarily to avoid constraint errors during wipe if needed, 
    // but CASCADE should handle most things if we delete in order.
    // However, dropping and recreatig or just DELETE is fine.
    
    db.execute("DELETE FROM transactions", []).map_err(|e| e.to_string())?;
    db.execute("DELETE FROM monthly_balances", []).map_err(|e| e.to_string())?;
    db.execute("DELETE FROM bank_accounts", []).map_err(|e| e.to_string())?;
    db.execute("DELETE FROM years", []).map_err(|e| e.to_string())?;
    db.execute("DELETE FROM settings", []).map_err(|e| e.to_string())?;
    
    Ok(())
}
