use gilrs::{EventType, GamepadId, Gilrs};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

use std::sync::{Arc, Mutex};
use std::time::Duration;

/// A gamepad plugged in, as the system sees it: the webview only lists it after one of its buttons is pressed
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeGamepad {
    pub id: usize,
    pub name: String,
    pub vendor_id: Option<u16>,
    pub product_id: Option<u16>,
}

#[derive(Default)]
pub struct GamepadState {
    pub gamepads: Vec<NativeGamepad>,
}

pub type SharedGamepadState = Arc<Mutex<GamepadState>>;

fn to_native(gilrs: &Gilrs, id: GamepadId) -> NativeGamepad {
    let gamepad = gilrs.gamepad(id);
    NativeGamepad {
        id: usize::from(id),
        name: gamepad.name().to_string(),
        vendor_id: gamepad.vendor_id(),
        product_id: gamepad.product_id(),
    }
}

/// Watches the gamepads in a thread of its own (Gilrs is not Send): keeps the list, and emits
/// "native-gamepad-connected" (NativeGamepad) and "native-gamepad-disconnected" (its id)
pub fn watch_gamepads(app: AppHandle, state: SharedGamepadState) {
    std::thread::spawn(move || {
        let mut gilrs = match Gilrs::new() {
            Ok(gilrs) => gilrs,
            Err(e) => {
                println!("[Gamepad] Gamepad watch failed: {:?}", e);
                return;
            }
        };

        let plugged: Vec<NativeGamepad> = gilrs.gamepads()
            .filter(|(_, gamepad)| gamepad.is_connected())
            .map(|(id, _)| to_native(&gilrs, id))
            .collect();
        println!("[Gamepad] {} gamepad(s) plugged in", plugged.len());
        state.lock().unwrap().gamepads = plugged;

        loop {
            while let Some(event) = gilrs.next_event() {
                match event.event {
                    EventType::Connected => {
                        let gamepad = to_native(&gilrs, event.id);
                        let mut lock = state.lock().unwrap();
                        // Some backends also report the gamepads already listed at start
                        lock.gamepads.retain(|g| g.id != gamepad.id);
                        lock.gamepads.push(gamepad.clone());
                        let _ = app.emit("native-gamepad-connected", gamepad);
                    }
                    EventType::Disconnected => {
                        let id = usize::from(event.id);
                        state.lock().unwrap().gamepads.retain(|g| g.id != id);
                        let _ = app.emit("native-gamepad-disconnected", id);
                    }
                    _ => {}
                }
            }
            // Only plugs and unplugs are watched here: the game reads the inputs through the webview
            std::thread::sleep(Duration::from_millis(100));
        }
    });
}

#[tauri::command]
pub fn list_gamepads(state: tauri::State<SharedGamepadState>) -> Vec<NativeGamepad> {
    state.lock().unwrap().gamepads.clone()
}
