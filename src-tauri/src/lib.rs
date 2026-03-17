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
        .setup(|app| {
            let conn = db::init_db(app.handle()).expect("Failed to initialize database");
            app.manage(AppState {
                db: Mutex::new(conn),
            });
            Ok(())
        })
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_aptabase::Builder::new("A-EU-8092222563").build())
        .plugin(tauri_plugin_process::init())
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
            commands::reset_application
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
