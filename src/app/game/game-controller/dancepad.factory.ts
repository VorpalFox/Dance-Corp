import { DancePadGamepad } from "./dancepad-gamepad"
import { DancePadKeyboard } from "./dancepad-keyboard"
import { IDancePad } from "./dancepad.interface"
import { Player } from "../game-model/player"

/** Dance pad of a player: its keyboard, or its gamepad followed by id through disconnections */
export function CreateDancePad(player: Player): IDancePad {
    if (player.gamepadId === undefined)
        throw new Error(`Player ${player.name ?? ""} has no gamepad`)

    if (player.gamepadId === Player.KEYBOARD_ID)
        return new DancePadKeyboard(player.keyBindingKeyboard)
    return new DancePadGamepad(player.gamepadId, player.keyBindingGamepad)
}
