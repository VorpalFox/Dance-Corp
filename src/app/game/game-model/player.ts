import { ArrowDirection } from "src/app/game/constants/arrow-direction.enum"

/** Serialized form of a Player (localStorage) */
export type PlayerJSON = {
    name: string | undefined
    userId: string | null
    gamepadId?: string
    // Before gamepadId: the gamepad with its index of the time
    gamepad?: { id: string }
    keyBindingGamepad: Record<string, ArrowDirection>
    keyBindingKeyboard: Record<string, ArrowDirection>
}

export class Player {
    //#region Constants
    static readonly KEYBOARD_ID = "Keyboard"
    //#endregion

    name: string | undefined
    userId: string | null = null
    // Id of the gamepad (Gamepad.id), or KEYBOARD_ID
    gamepadId: string | undefined
    keyBindingGamepad: Map<number, ArrowDirection>
    keyBindingKeyboard: Map<string, ArrowDirection>

    constructor() {
        this.keyBindingGamepad = Player.DefaultGamepadBinding()
        this.keyBindingKeyboard = Player.DefaultKeyboardBinding()
    }

    toJSON(): PlayerJSON {
        return {
            name: this.name,
            userId: this.userId,
            gamepadId: this.gamepadId,
            keyBindingGamepad: Object.fromEntries(this.keyBindingGamepad), // Convert Map to object
            keyBindingKeyboard: Object.fromEntries(this.keyBindingKeyboard), // Convert Map to object
        }
    }

    //#region Statics
    static FromJSON(json: PlayerJSON): Player {
        const player = new Player()
        player.userId = json.userId
        player.gamepadId = json.gamepadId ?? json.gamepad?.id
        player.keyBindingGamepad = new Map<number, ArrowDirection>(Object.entries(json.keyBindingGamepad).map(([k, v]) => [Number(k), v]))
        player.keyBindingKeyboard = new Map<string, ArrowDirection>(Object.entries(json.keyBindingKeyboard))
        return player
    }

    static DefaultGamepadBinding(): Map<number, ArrowDirection> {
        return new Map<number, ArrowDirection>([
            [0, ArrowDirection.Left],  // Button 0 -> Left
            [1, ArrowDirection.Down],  // Button 1 -> Down
            [2, ArrowDirection.Up],    // Button 2 -> Up
            [3, ArrowDirection.Right]  // Button 3 -> Right
        ])
    }

    static DefaultKeyboardBinding(): Map<string, ArrowDirection> {
        return new Map<string, ArrowDirection>([
            ['ArrowLeft', ArrowDirection.Left],
            ['ArrowDown', ArrowDirection.Down],
            ['ArrowUp', ArrowDirection.Up],
            ['ArrowRight', ArrowDirection.Right]
        ])
    }
    //#endregion
}