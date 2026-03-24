mod db;
mod models;
mod commands;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<db::Connection>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_aptabase::Builder::new("A-EU-8092222563").build())
        .setup(|app| {
            match db::init_db(app.handle()) {
                Ok(conn) => {
                    app.manage(AppState {
                        db: std::sync::Mutex::new(conn),
                    });
                }
                Err(e) => {
                    eprintln!("Database initialization failed: {}", e);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_bank_accounts,
            commands::add_bank_account,
            commands::update_bank_account,
            commands::delete_bank_account,
            commands::get_transactions,
            commands::add_transaction,
            commands::update_transaction,
            commands::delete_transaction,
            commands::get_initial_balance,
            commands::set_initial_balance,
            commands::get_years,
            commands::add_year,
            commands::update_year,
            commands::delete_year,
            commands::export_year_csv,
            commands::export_month_csv,
            commands::get_setting,
            commands::set_setting,
            commands::reset_application,
            commands::convert_currency_data,
            commands::get_account_balance,
            commands::get_exchange_rate
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
