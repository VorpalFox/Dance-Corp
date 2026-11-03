import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ArrowDirection } from "src/app/game/constants/arrow-direction.enum"
import { ArrowState } from "src/app/game/game-controller/dancepad.interface"
import { DancePadGamepad } from "src/app/game/game-controller/dancepad-gamepad"
import { Player } from "src/app/game/game-model/player"

/** Gamepad of this id, with the given buttons pressed */
function Gamepad(id: string, index: number, pressed: number[] = []): Gamepad {
  const buttons = Array.from({ length: 4 }, (_, button) => ({ pressed: pressed.includes(button), touched: false, value: 0 }))
  return { id, index, buttons } as unknown as Gamepad
}

describe("DancePadGamepad", () => {
  let gamepads: (Gamepad | null)[]

  beforeEach(() => {
    gamepads = [null, null, null, null]
    vi.stubGlobal("navigator", { getGamepads: () => gamepads })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function CreatePad(): DancePadGamepad {
    return new DancePadGamepad("pad", Player.DefaultGamepadBinding())
  }

  it("gives a press, then a hold, then nothing once released", () => {
    const pad = CreatePad()
    gamepads[0] = Gamepad("pad", 0, [2])
    expect(pad.GetRefreshedState()[ArrowDirection.Up]).toBe(ArrowState.Press)
    expect(pad.GetRefreshedState()[ArrowDirection.Up]).toBe(ArrowState.Hold)
    gamepads[0] = Gamepad("pad", 0)
    expect(pad.GetRefreshedState()[ArrowDirection.Up]).toBe(ArrowState.Empty)
  })

  it("ignores the other gamepads", () => {
    const pad = CreatePad()
    gamepads[0] = Gamepad("other", 0, [0])
    expect(pad.GetRefreshedState()[ArrowDirection.Left]).toBe(ArrowState.Empty)
  })

  it("releases its arrows when the gamepad is disconnected, without pressing them again", () => {
    const pad = CreatePad()
    gamepads[0] = Gamepad("pad", 0, [0])
    pad.GetRefreshedState()
    gamepads[0] = null
    expect(pad.GetRefreshedState()[ArrowDirection.Left]).toBe(ArrowState.Empty)
    expect(pad.GetRefreshedState()[ArrowDirection.Left]).toBe(ArrowState.Empty)
  })

  it("plays again once the gamepad is reconnected, at another index", () => {
    const pad = CreatePad()
    gamepads[0] = Gamepad("pad", 0)
    pad.GetRefreshedState()
    gamepads[0] = null
    pad.GetRefreshedState()
    gamepads[0] = Gamepad("other", 0)
    gamepads[1] = Gamepad("pad", 1, [3])
    expect(pad.GetRefreshedState()[ArrowDirection.Right]).toBe(ArrowState.Press)
  })

  it("plays a gamepad that appears after the pad is created", () => {
    const pad = CreatePad()
    expect(pad.GetRefreshedState()[ArrowDirection.Down]).toBe(ArrowState.Empty)
    gamepads[2] = Gamepad("pad", 2, [1])
    expect(pad.GetRefreshedState()[ArrowDirection.Down]).toBe(ArrowState.Press)
  })
})
