import { describe, expect, it } from "vitest"

import { ArrowDirection } from "src/app/game/constants/arrow-direction.enum"
import { Player } from "src/app/game/game-model/player"

// Same round trip as UserConfigService: JSON.stringify to the localStorage, then FromJSON
function Reload(player: Player): Player {
  return Player.FromJSON(JSON.parse(JSON.stringify(player)))
}

describe("Player", () => {
  it("reloads its user, its gamepad and its key bindings", () => {
    const player = new Player()
    player.userId = "uid"
    player.gamepadId = "pad"
    player.keyBindingGamepad.set(7, ArrowDirection.Start)
    player.keyBindingKeyboard.set("Enter", ArrowDirection.Start)

    const reloaded = Reload(player)

    expect(reloaded).toBeInstanceOf(Player)
    expect(reloaded.userId).toBe("uid")
    expect(reloaded.gamepadId).toBe("pad")
    expect(reloaded.keyBindingGamepad).toEqual(player.keyBindingGamepad)
    expect(reloaded.keyBindingKeyboard).toEqual(player.keyBindingKeyboard)
  })

  it("keeps the gamepad buttons as numbers", () => {
    const reloaded = Reload(new Player())
    expect([...reloaded.keyBindingGamepad.keys()]).toEqual([0, 1, 2, 3])
  })

  it("reloads a keyboard player", () => {
    const player = new Player()
    player.gamepadId = Player.KEYBOARD_ID
    expect(Reload(player).gamepadId).toBe(Player.KEYBOARD_ID)
  })

  it("reads the gamepad id of a player saved with its gamepad index", () => {
    const saved = { ...JSON.parse(JSON.stringify(new Player())), gamepad: { index: 2, id: "pad" } }
    expect(Player.FromJSON(saved).gamepadId).toBe("pad")
  })
})
