#[cfg_attr(mobile, tauri::mobile_entry_point)]

mod discord;
mod gamepad;
mod steam;

use tauri::Manager;

pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init()) // ← AJOUT IMPORTANT
    .setup(|app| {
      let gamepad_state = app.state::<gamepad::SharedGamepadState>().inner().clone();
      gamepad::watch_gamepads(app.handle().clone(), gamepad_state);
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .manage(std::sync::Mutex::new(discord::DiscordState::new()))
    .manage(gamepad::SharedGamepadState::default())
    .manage(std::sync::Mutex::new(steam::SteamState::new()))
    .invoke_handler(tauri::generate_handler![
            discord::init_discord,
            discord::update_discord_rpc,
            discord::clear_discord_rpc,
            steam::init_steam,
            steam::update_steam_rpc,
            steam::clear_steam_rpc,
            gamepad::list_gamepads
        ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}