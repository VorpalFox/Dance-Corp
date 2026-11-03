import { ArrowState, DancePadInput, IDancePad } from "./dancepad.interface"

import { ArrowDirection } from "src/app/game/constants/arrow-direction.enum"

export class DancePadGamepad implements IDancePad {
    private gamepadId: string
    // Index where the gamepad was last found: checked first, searched again by id once it moves
    private gamepadIndex: number | null = null
    private currentState: Set<number>
    private previousState: Set<number>
    private keyBinding: Map<number, ArrowDirection>

    public lastExposedState: DancePadInput

    // TODO: Add input mapping for enter button
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(gamepadId: string, keyBinding: Map<number, ArrowDirection>, enterBinding: number = -1) {
        this.gamepadId = gamepadId
        this.currentState = new Set()
        this.previousState = new Set()
        this.keyBinding = keyBinding
        this.lastExposedState = [0, 0, 0, 0, 0]
    }

    // Update gamepad state. A disconnected gamepad gives no input: its held arrows are released
    public GetRefreshedState(): DancePadInput {
        const gamepad = DancePadGamepad.FindGamepad(this.gamepadId, this.gamepadIndex)
        this.gamepadIndex = gamepad?.index ?? this.gamepadIndex

        this.previousState = new Set(this.currentState)
        this.currentState.clear()

        gamepad?.buttons.forEach((button, index) => {
            const direction = this.keyBinding.get(index)
            if (button.pressed && direction !== undefined) {
                this.currentState.add(direction)
            }
        })

        this.lastExposedState = [
            this.GetArrowInput(ArrowDirection.Left),
            this.GetArrowInput(ArrowDirection.Down),
            this.GetArrowInput(ArrowDirection.Up),
            this.GetArrowInput(ArrowDirection.Right),
            this.GetArrowInput(ArrowDirection.Start)
        ] as DancePadInput

        return this.lastExposedState
    }

    private GetArrowInput(direction: ArrowDirection): ArrowState {
        if (this.IsButtonJustPressed(direction)) {
            return ArrowState.Press
        } else if (this.IsButtonDown(direction)) {
            return ArrowState.Hold
        } else {
            return ArrowState.Empty
        }
    }

    // Check if a button is currently pressed
    private IsButtonDown(buttonIndex: number): boolean {
        return this.currentState.has(buttonIndex)
    }

    // Check if a button was just pressed
    private IsButtonJustPressed(buttonIndex: number): boolean {
        return this.currentState.has(buttonIndex) && !this.previousState.has(buttonIndex)
    }

    // Check if a button was just released
    private IsButtonJustReleased(buttonIndex: number): boolean {
        return !this.currentState.has(buttonIndex) && this.previousState.has(buttonIndex)
    }

    public Destroy(): void {
        // Nothing to release: the gamepad is polled
    }

    //#region Statics
    // The gamepad of this id, looked up at indexHint first. Null while it is disconnected, or not seen yet by the browser
    static FindGamepad(gamepadId: string, indexHint: number | null = null): Gamepad | null {
        const gamepads = navigator.getGamepads()
        const hinted = indexHint === null ? null : gamepads.at(indexHint)
        if (hinted?.id === gamepadId)
            return hinted
        return gamepads.find(gamepad => gamepad?.id === gamepadId) ?? null
    }
    //#endregion
}
