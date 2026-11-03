import { GamepadService, GamepadStatus } from "src/app/services/gameplay/gamepad.service"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { NativeGamepad, NativeGamepadService } from "src/app/services/thirdpartyapp/native-gamepad.service"
import { Player } from "src/app/game/game-model/player"
import { Subject } from "rxjs"
import { TestBed } from "@angular/core/testing"
import { signal } from "@angular/core"
import { UserConfigService } from "src/app/services/userconfig.service"

const PAD_WEB_ID = "USB Gamepad (STANDARD GAMEPAD Vendor: 0079 Product: 0011)"
const RETRO_CONTROLLER: NativeGamepad = { id: 0, name: "Retro Controller", vendorId: 0x79, productId: 0x11 }

describe("GamepadService", () => {
  let gamepads: (Gamepad | null)[]
  let isPlugged: boolean | null
  let nativeGamepads: ReturnType<typeof signal<NativeGamepad[]>>
  let players: Partial<Player>[]

  beforeEach(() => {
    gamepads = []
    isPlugged = null
    nativeGamepads = signal([])
    players = []
    vi.stubGlobal("navigator", { ...navigator, getGamepads: () => gamepads })
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    TestBed.configureTestingModule({
      providers: [
        { provide: UserConfigService, useValue: { players } },
        { provide: NativeGamepadService, useValue: { connected: new Subject(), IsPlugged: () => isPlugged, GetGamepads: () => nativeGamepads() } },
      ],
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function Status(gamepadId: string): GamepadStatus {
    return TestBed.inject(GamepadService).GetStatus(gamepadId)
  }

  it("gives the keyboard and the gamepads seen by the webview as active", () => {
    gamepads = [{ id: "pad", index: 0 } as Gamepad]
    expect(Status(Player.KEYBOARD_ID)).toBe(GamepadStatus.Active)
    expect(Status("pad")).toBe(GamepadStatus.Active)
  })

  it("tells, from the system, whether a gamepad not seen yet is plugged in", () => {
    isPlugged = true
    expect(Status("pad")).toBe(GamepadStatus.Plugged)
    isPlugged = false
    expect(Status("pad")).toBe(GamepadStatus.Unplugged)
    isPlugged = null
    expect(Status("pad")).toBe(GamepadStatus.Unknown)
  })

  function Connect(id: string) {
    gamepads.push({ id, index: gamepads.length } as Gamepad)
    TestBed.inject(GamepadService).OnGamepadConnect({ gamepad: gamepads.at(-1) } as GamepadEvent)
  }

  function Labels(): [string, boolean][] {
    return TestBed.inject(GamepadService).GetGamepads().map(gamepad => [gamepad.label, gamepad.isDisabled])
  }

  it("disables a gamepad only the system sees, until the webview sees it", () => {
    nativeGamepads.set([RETRO_CONTROLLER, { ...RETRO_CONTROLLER, id: 1 }, { ...RETRO_CONTROLLER, id: 2, vendorId: null }])
    expect(Labels()).toEqual([[Player.KEYBOARD_ID, false], ["Retro Controller (press a button)", true]])

    Connect(PAD_WEB_ID)
    expect(Labels()).toEqual([[Player.KEYBOARD_ID, false], ["USB Gamepad", false]])
  })

  it("lists a player's gamepad not seen yet by its web name, as disconnected when the system does not see it", () => {
    players.push({ gamepadId: PAD_WEB_ID }, { gamepadId: PAD_WEB_ID }, { gamepadId: Player.KEYBOARD_ID })
    nativeGamepads.set([RETRO_CONTROLLER])
    isPlugged = true
    expect(Labels()).toEqual([[Player.KEYBOARD_ID, false], ["USB Gamepad", false]])
    nativeGamepads.set([])
    isPlugged = false
    expect(Labels()).toEqual([[Player.KEYBOARD_ID, false], ["[disconnected] USB Gamepad", false]])
    isPlugged = null
    expect(Labels()).toEqual([[Player.KEYBOARD_ID, false], ["[disconnected] USB Gamepad", false]])
  })

  it("shows the device name, without what the browser adds", () => {
    expect(GamepadService.GetDisplayName(PAD_WEB_ID)).toBe("USB Gamepad")
    expect(GamepadService.GetDisplayName("Xbox 360 Controller (XInput STANDARD GAMEPAD)")).toBe("Xbox 360 Controller")
    expect(GamepadService.GetDisplayName("45e-28e-Xbox 360 Wired Controller")).toBe("Xbox 360 Wired Controller")
    expect(GamepadService.GetDisplayName(Player.KEYBOARD_ID)).toBe(Player.KEYBOARD_ID)
  })
})
