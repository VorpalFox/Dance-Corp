import { Injectable, NgZone, inject, signal } from '@angular/core'

import { NativeGamepad, NativeGamepadService } from '../thirdpartyapp/native-gamepad.service'

import { AppComponent } from 'src/app/app.component'
import { DancePadGamepad } from 'src/app/game/game-controller/dancepad-gamepad'
import { Player } from 'src/app/game/game-model/player'
import { UserConfigService } from '../userconfig.service'

export enum GamepadStatus {
    Active, // The keyboard, or a gamepad the webview sees: it plays
    Plugged, // Plugged in (desktop), not seen by the webview yet: it plays from its first button press
    Unplugged, // Not plugged in (desktop)
    Unknown, // Not seen by the webview yet, and the system cannot tell (browser, XInput gamepad)
}

@Injectable({
    providedIn: 'root',
})
export class GamepadService {
    private userConfigService = inject(UserConfigService)
    private nativeGamepadService = inject(NativeGamepadService)
    private ngZone = inject(NgZone)

    // Ids of the gamepads the webview sees
    private webGamepadIds = signal<string[]>([])

    constructor() {
        this.OnGamepadConnect = this.OnGamepadConnect.bind(this)
        this.OnGamepadDisconnect = this.OnGamepadDisconnect.bind(this)
        window.addEventListener("gamepadconnected", this.OnGamepadConnect)
        window.addEventListener("gamepaddisconnected", this.OnGamepadDisconnect)
        this.nativeGamepadService.connected.subscribe(gamepad => this.OnNativeGamepadConnect(gamepad))
    }

    // The dance pads follow their gamepad by id: a reconnected gamepad plays again by itself
    OnGamepadConnect(event: GamepadEvent) {
        const gamepad = event.gamepad
        console.log('Gamepad connected : ' + gamepad.id)
        if (!this.webGamepadIds().includes(gamepad.id))
            this.webGamepadIds.update(ids => [...ids, gamepad.id])

        const playerName = this.GetAssignedPlayerName(gamepad.id)
        if (playerName !== null)
            AppComponent.PresentOkToast(`${playerName}: gamepad ${GamepadService.GetDisplayName(gamepad.id)} connected`)
    }

    OnGamepadDisconnect(event: GamepadEvent) {
        console.log('Gamepad disconnected : ' + event.gamepad.id)
        this.webGamepadIds.update(ids => ids.filter(id => id !== event.gamepad.id))

        const playerName = this.GetAssignedPlayerName(event.gamepad.id)
        if (playerName !== null)
            AppComponent.PresentWarningToast(`${playerName}: gamepad ${GamepadService.GetDisplayName(event.gamepad.id)} disconnected`)
    }

    // Desktop: a gamepad plugged in before the webview sees it waits for a button press
    private OnNativeGamepadConnect(gamepad: NativeGamepad) {
        this.userConfigService.players.forEach((player, index) => {
            if (player.gamepadId === undefined || NativeGamepadService.IsGamepadOf(gamepad, player.gamepadId) !== true) return
            if (DancePadGamepad.FindGamepad(player.gamepadId) !== null) return
            AppComponent.PresentOkToast(`${player.name ?? `Player ${index + 1}`}: gamepad plugged in, press one of its buttons to activate it`)
        })
    }

    /**
     * The keyboard, the gamepads the webview sees, the players' gamepads it does not see yet (shown as seen when the
     * system sees them, "[disconnected]" otherwise), then the ones only the system sees, disabled until a button press
     */
    GetGamepads(): GamepadReference[] {
        const webIds = this.webGamepadIds()
        const playerIds = this.userConfigService.players
            .flatMap(player => player.gamepadId === undefined || player.gamepadId === Player.KEYBOARD_ID || webIds.includes(player.gamepadId) ? [] : [player.gamepadId])
            .filter((id, index, ids) => ids.indexOf(id) === index)
        const knownIds = [...webIds, ...playerIds]
        const unseenIds = this.nativeGamepadService.GetGamepads()
            .flatMap(gamepad => NativeGamepadService.ToWebGamepadId(gamepad) ?? [])
            .filter((id, index, ids) => ids.indexOf(id) === index && !knownIds.some(knownId => NativeGamepadService.HaveSameDevice(knownId, id)))

        return [
            { id: Player.KEYBOARD_ID, label: Player.KEYBOARD_ID, isDisabled: false },
            ...webIds.map(id => ({ id, label: GamepadService.GetDisplayName(id), isDisabled: false })),
            ...playerIds.map(id => ({
                id,
                label: this.nativeGamepadService.IsPlugged(id) === true ? GamepadService.GetDisplayName(id) : `[disconnected] ${GamepadService.GetDisplayName(id)}`,
                isDisabled: false,
            })),
            ...unseenIds.map(id => ({ id, label: `${GamepadService.GetDisplayName(id)} (press a button)`, isDisabled: true })),
        ]
    }

    GetStatus(gamepadId: string): GamepadStatus {
        if (gamepadId === Player.KEYBOARD_ID || DancePadGamepad.FindGamepad(gamepadId) !== null)
            return GamepadStatus.Active

        const isPlugged = this.nativeGamepadService.IsPlugged(gamepadId)
        if (isPlugged === null) return GamepadStatus.Unknown
        return isPlugged ? GamepadStatus.Plugged : GamepadStatus.Unplugged
    }

    // Name of the first player playing on this gamepad, null if none
    private GetAssignedPlayerName(gamepadId: string): string | null {
        const players = this.userConfigService.players
        const index = players.findIndex(player => player.gamepadId === gamepadId)
        if (index === -1) return null
        return players[index].name ?? `Player ${index + 1}`
    }

    //#region Statics
    // The device name, without what the browser adds: "USB Gamepad (STANDARD GAMEPAD Vendor: 0079 Product: 0011)" gives "USB Gamepad"
    static GetDisplayName(gamepadId: string): string {
        const name = gamepadId
            .replace(/\s*\([^()]*(?:STANDARD GAMEPAD|Vendor: [0-9a-f]{1,4} Product: [0-9a-f]{1,4})[^()]*\)$/i, "")
            .replace(/^[0-9a-f]{1,4}-[0-9a-f]{1,4}-/i, "")
            .trim()
        return name === "" ? gamepadId : name
    }
    //#endregion
}

export type GamepadReference = {
    id: string
    label: string
    // A gamepad only the system sees, that no player has: it can be chosen once the webview sees it
    isDisabled: boolean
}
