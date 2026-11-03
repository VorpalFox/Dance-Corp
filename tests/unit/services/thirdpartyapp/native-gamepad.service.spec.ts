import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks"

import type { NativeGamepad } from "src/app/services/thirdpartyapp/native-gamepad.service"
import { emit } from "@tauri-apps/api/event"

const PAD: NativeGamepad = { id: 3, name: "Dance pad", vendorId: 0x0079, productId: 0x0011 }
const PAD_WEB_ID = "USB Gamepad (Vendor: 0079 Product: 0011)"

describe("NativeGamepadService", () => {
  // isTauri is read when the module loads: the Tauri mock goes first, then the service is imported.
  // The test files share their modules (no isolation): another file may have loaded it already, hence the reset
  let NativeGamepadService: typeof import("src/app/services/thirdpartyapp/native-gamepad.service").NativeGamepadService
  let plugged: NativeGamepad[]

  beforeAll(async () => {
    vi.resetModules()
    mockIPC(cmd => cmd === "list_gamepads" ? plugged : undefined, { shouldMockEvents: true })
    NativeGamepadService = (await import("src/app/services/thirdpartyapp/native-gamepad.service")).NativeGamepadService
  })

  afterAll(() => {
    clearMocks()
  })

  beforeEach(() => {
    plugged = []
    vi.spyOn(console, "log").mockImplementation(() => undefined)
  })

  describe("ParseDeviceIds", () => {
    it("reads the vendor and product ids of a Chromium / WebView2 id", () => {
      expect(NativeGamepadService.ParseDeviceIds(PAD_WEB_ID)).toEqual({ vendorId: 0x79, productId: 0x11 })
    })

    it("reads the vendor and product ids of a Firefox / WebKitGTK id", () => {
      expect(NativeGamepadService.ParseDeviceIds("45e-28e-Xbox 360 Wired Controller")).toEqual({ vendorId: 0x45e, productId: 0x28e })
    })

    it("cannot tell an XInput gamepad", () => {
      expect(NativeGamepadService.ParseDeviceIds("Xbox 360 Controller (XInput STANDARD GAMEPAD)")).toBeNull()
    })
  })

  it("writes an id that parses back, only with vendor and product ids", () => {
    const webId = NativeGamepadService.ToWebGamepadId({ id: 0, name: "Retro Controller", vendorId: 121, productId: 17 })
    expect(webId).toBe("Retro Controller (Vendor: 0079 Product: 0011)")
    expect(NativeGamepadService.HaveSameDevice(webId!, PAD_WEB_ID)).toBe(true)
    expect(NativeGamepadService.ToWebGamepadId({ ...PAD, vendorId: null })).toBeNull()
  })

  it("tells two ids of the same device apart from unknown ones", () => {
    expect(NativeGamepadService.HaveSameDevice("Other (Vendor: 1234 Product: 5678)", PAD_WEB_ID)).toBe(false)
    expect(NativeGamepadService.HaveSameDevice("Xbox 360 Controller (XInput STANDARD GAMEPAD)", "Xbox 360 Controller (XInput STANDARD GAMEPAD)")).toBe(false)
  })

  it("knows nothing before its init", () => {
    expect(new NativeGamepadService().IsPlugged(PAD_WEB_ID)).toBeNull()
  })

  it("tells whether the gamepad of a webview id is plugged in", async () => {
    plugged = [PAD]
    const service = new NativeGamepadService()
    await service.Init()
    expect(service.IsPlugged(PAD_WEB_ID)).toBe(true)
    expect(service.IsPlugged("Other (Vendor: 1234 Product: 5678)")).toBe(false)
    expect(service.IsPlugged("Xbox 360 Controller (XInput STANDARD GAMEPAD)")).toBeNull()
  })

  it("follows the plugs and unplugs", async () => {
    const service = new NativeGamepadService()
    const connected = vi.fn()
    service.connected.subscribe(connected)
    await service.Init()

    await emit("native-gamepad-connected", PAD)
    expect(service.IsPlugged(PAD_WEB_ID)).toBe(true)
    expect(connected).toHaveBeenCalledWith(PAD)

    await emit("native-gamepad-disconnected", PAD.id)
    expect(service.IsPlugged(PAD_WEB_ID)).toBe(false)
  })
})
