import { Injectable, signal } from '@angular/core'
import { Subject } from 'rxjs'
import { invoke } from '@tauri-apps/api/core'
import isTauri from 'src/app/shared/utils/tauri'
import { listen } from '@tauri-apps/api/event'

/** A gamepad plugged in, as the system sees it (src-tauri/src/gamepad.rs) */
export type NativeGamepad = {
    id: number
    name: string
    vendorId: number | null
    productId: number | null
}

/**
 * Desktop only: the gamepads plugged in, from Tauri. The webview lists a gamepad only once
 * one of its buttons is pressed, the system lists it as soon as it is plugged.
 * In the browser, nothing is known: every lookup answers null.
 */
@Injectable({ providedIn: 'root' })
export class NativeGamepadService {

    private gamepads = signal<NativeGamepad[]>([])
    private isAvailable = false

    /** A gamepad plugged in while the app runs */
    readonly connected: Subject<NativeGamepad> = new Subject()

    async Init() {
        if (!isTauri) return

        try {
            await listen<NativeGamepad>("native-gamepad-connected", event => {
                this.gamepads.update(gamepads => [...gamepads.filter(gamepad => gamepad.id !== event.payload.id), event.payload])
                this.connected.next(event.payload)
            })
            await listen<number>("native-gamepad-disconnected", event => {
                this.gamepads.update(gamepads => gamepads.filter(gamepad => gamepad.id !== event.payload))
            })
            this.gamepads.set(await invoke<NativeGamepad[]>("list_gamepads"))
            this.isAvailable = true
            console.log("Native gamepads:", this.gamepads())
        } catch (e) {
            console.warn("Native gamepad watch failed", e)
        }
    }

    /** Whether the gamepad of this webview id is plugged in, null when it cannot be told (browser, id without vendor and product) */
    IsPlugged(webGamepadId: string): boolean | null {
        if (!this.isAvailable) return null
        const device = NativeGamepadService.ParseDeviceIds(webGamepadId)
        if (device === null) return null
        return this.gamepads().some(gamepad => NativeGamepadService.IsSameDevice(gamepad, device))
    }

    GetGamepads(): NativeGamepad[] {
        return this.gamepads()
    }

    //#region Statics
    /** Whether this native gamepad is the one of this webview id, null when it cannot be told */
    static IsGamepadOf(gamepad: NativeGamepad, webGamepadId: string): boolean | null {
        const device = NativeGamepadService.ParseDeviceIds(webGamepadId)
        return device === null ? null : NativeGamepadService.IsSameDevice(gamepad, device)
    }

    /**
     * Vendor and product ids written in a webview gamepad id: "Pad (Vendor: 0079 Product: 0011)" (Chromium, WebView2),
     * or "0079-0011-Pad" (Firefox, WebKitGTK). Null when absent, like for XInput gamepads on Windows.
     */
    static ParseDeviceIds(webGamepadId: string): { vendorId: number, productId: number } | null {
        const match = /Vendor: ([0-9a-f]{1,4}) Product: ([0-9a-f]{1,4})/i.exec(webGamepadId)
            ?? /^([0-9a-f]{1,4})-([0-9a-f]{1,4})-/i.exec(webGamepadId)
        if (match === null) return null
        return { vendorId: parseInt(match[1], 16), productId: parseInt(match[2], 16) }
    }

    /** Whether these two webview ids are the same device model, false when one cannot be told */
    static HaveSameDevice(webGamepadIdA: string, webGamepadIdB: string): boolean {
        const deviceA = NativeGamepadService.ParseDeviceIds(webGamepadIdA)
        const deviceB = NativeGamepadService.ParseDeviceIds(webGamepadIdB)
        return deviceA !== null && deviceB !== null && deviceA.vendorId === deviceB.vendorId && deviceA.productId === deviceB.productId
    }

    /**
     * A webview-like id for a gamepad the webview has not seen yet, written as Chromium does so that it parses back:
     * "Retro Controller (Vendor: 0079 Product: 0011)". Null without vendor and product ids.
     */
    static ToWebGamepadId(gamepad: NativeGamepad): string | null {
        if (gamepad.vendorId === null || gamepad.productId === null) return null
        const Hex = (value: number) => value.toString(16).padStart(4, "0")
        return `${gamepad.name} (Vendor: ${Hex(gamepad.vendorId)} Product: ${Hex(gamepad.productId)})`
    }

    private static IsSameDevice(gamepad: NativeGamepad, device: { vendorId: number, productId: number }): boolean {
        return gamepad.vendorId === device.vendorId && gamepad.productId === device.productId
    }
    //#endregion
}
