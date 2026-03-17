use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct BankAccount {
    pub id: i32,
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Transaction {
    pub id: i64,
    pub bank_account_id: i64,
    pub year: String,
    pub month: i64,
    pub transaction_date: String,
    pub amount: f64,
    pub transaction_type: String, // 'Credit' or 'Debit'
    pub remarks: Option<String>,
    pub custom_data: Option<String>, // JSON string
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InitialBalanceResponse {
    pub balance: f64,
    pub is_manual: bool,
}
