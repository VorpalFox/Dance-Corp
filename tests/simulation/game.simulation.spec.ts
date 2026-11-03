import { CreateChart, CreateGame, CreateMusic, Input, PerfectInputs, Play, Simulate, TimeOfBeat } from "./simulator"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ArrowDirection } from "src/app/game/constants/arrow-direction.enum"
import { ArrowState } from "src/app/game/game-controller/dancepad.interface"
import { ArrowType } from "src/app/game/constants/arrow-type.enum"
import { CONFIG } from "src/app/game/constants/game-config"
import { GameRound } from "src/app/game/game-model/gameRound"
import { Precision } from "src/app/game/constants/precision.enum"
import { UserNoteDto } from "src/app/pages/user-profile/user.dto"

// 4ths, 8ths and jumps on every direction
const MIXED_CHART = CreateChart(
  ["1000", "0100", "0010", "0001"],
  ["1000", "0000", "0100", "0010", "1001", "0000", "0110", "0000"],
  ["1000", "0100", "0010", "0001"],
)

// One tap per beat on the left arrow
function TapChart(measureCount: number) {
  return CreateChart(...Array.from({ length: measureCount }, () => ["1000", "1000", "1000", "1000"]))
}

function Precisions(arrows: { precision: Precision | null }[]): (Precision | null)[] {
  return arrows.map(arrow => arrow.precision)
}

// Without a player display, the precision messages are never consumed: they hold the whole game
function Messages(round: GameRound): Precision[] {
  return round.precisionMessage.map(message => message.precision)
}

describe("Game simulation", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout", "setInterval", "Date"] })
    // jsdom does not play media
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined)
    vi.spyOn(console, "log").mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe("perfect play", () => {
    it("judges every arrow Perfect at a constant BPM, and gives the max score", async () => {
      const music = CreateMusic({ bpms: "0=120" })
      const { round, announcer, userCache } = await Simulate(music, MIXED_CHART, PerfectInputs(music, MIXED_CHART))

      expect(new Set(Precisions(round.arrowManager.arrowMap))).toEqual(new Set([Precision.Perfect]))
      expect(round.isFinished).toBe(true)
      expect(round.comboCount).toBe(round.arrowManager.arrowMap.length)
      expect(round.score).toBeCloseTo(CONFIG.SCORE.MAX, 3)
      expect(Messages(round)).toEqual(Precisions(round.arrowManager.arrowMap))
      expect(announcer.PlayAnnouncer).toHaveBeenCalledWith("victory")
      expect(userCache.UpdateUserStatsFromRound).toHaveBeenCalledTimes(1)
    })

    // The score adds up scorePerArrow: the rounding leaves it just below CONFIG.SCORE.MAX
    it("plays the special crowd sound on a perfect game", async () => {
      const music = CreateMusic({ bpms: "0=120" })
      const { announcer } = await Simulate(music, MIXED_CHART, PerfectInputs(music, MIXED_CHART))

      expect(announcer.PlayCrowdOneShot).toHaveBeenCalledWith("special")
    })

    it("stays Perfect through BPM changes, stops and an offset", async () => {
      const music = CreateMusic({ bpms: "0=120,4=180,8=90", stops: "6=0.5,10=0.25", offset: -0.3 })
      const { round } = await Simulate(music, MIXED_CHART, PerfectInputs(music, MIXED_CHART))

      expect(new Set(Precisions(round.arrowManager.arrowMap))).toEqual(new Set([Precision.Perfect]))
      expect(round.isFinished).toBe(true)
    })

    it("stays Perfect with a positive offset", async () => {
      const music = CreateMusic({ bpms: "0=150", offset: 0.4 })
      // Beat 0 is before the music starts: the chart begins on the second measure
      const chart = CreateChart(["0000", "0000", "0000", "0000"], ...MIXED_CHART.stepChart.map(m => m.steps.map(row => row.join(""))))
      const { round } = await Simulate(music, chart, PerfectInputs(music, chart))

      expect(new Set(Precisions(round.arrowManager.arrowMap))).toEqual(new Set([Precision.Perfect]))
    })

    it("validates the holds kept until their end", async () => {
      const music = CreateMusic({ bpms: "0=120" })
      const chart = CreateChart(["2000", "0000", "0100", "0000"], ["3000", "0000", "0000", "0000"], ["1000", "0000", "0000", "0000"])
      const { round } = await Simulate(music, chart, PerfectInputs(music, chart))

      const hold = round.arrowManager.arrowMap[0]
      expect(hold.precision).toBe(Precision.Perfect)
      expect(hold.isValid).toBe(true)
      expect(hold.isMissed).toBe(false)
      expect(round.isFinished).toBe(true)
      // The press precision, then OK at the end of the hold
      expect(Messages(round)).toEqual([Precision.Perfect, Precision.Perfect, Precision.Ok, Precision.Perfect])
    })

    it("plays a hold without tail as a one-row hold", async () => {
      const music = CreateMusic({ bpms: "0=120" })
      const chart = CreateChart(["2000", "0000", "0100", "0000"], ["1000", "0000", "0000", "0000"])
      const { round } = await Simulate(music, chart, PerfectInputs(music, chart))

      const hold = round.arrowManager.arrowMap[0]
      expect(hold.type).toBe(ArrowType.Hold)
      expect(hold.holdLength).toBe(1)
      expect(hold.isValid).toBe(true)
      expect(Messages(round)).toEqual([Precision.Perfect, Precision.Ok, Precision.Perfect, Precision.Perfect])
      expect(round.isFinished).toBe(true)
    })

    // A hold head scores like a tap, then its hold beats
    it("gives the max score with holds", async () => {
      const music = CreateMusic({ bpms: "0=120" })
      const chart = CreateChart(["2000", "0000", "0100", "0000"], ["3000", "0000", "0000", "0000"], ["1000", "0000", "0000", "0000"])
      const { round } = await Simulate(music, chart, PerfectInputs(music, chart))

      expect(round.score).toBeCloseTo(CONFIG.SCORE.MAX, 3)
    })
  })

  describe("timing windows", () => {
    // The game judges the press on the next frame: up to 16 ms after it.
    // The chart starts on beat 1, so that an early press still happens after the music start
    it.each([
      [0.05, Precision.Great],
      [0.1, Precision.Good],
      [0.2, Precision.Almost],
      [-0.06, Precision.Great],
      [-0.1, Precision.Good],
    ])("judges a press %f s off the beat %s", async (delay, precision) => {
      const music = CreateMusic({ bpms: "0=60" })
      const chart = CreateChart(["0000", "1000", "0000", "1000"])
      const { round } = await Simulate(music, chart, PerfectInputs(music, chart, delay))

      expect(new Set(Precisions(round.arrowManager.arrowMap))).toEqual(new Set([precision]))
      expect(Messages(round)).toEqual([precision, precision])
    })
  })

  describe("streams", () => {
    it("judges each press on its own arrow, on 16ths on alternating arrows", async () => {
      const music = CreateMusic({ bpms: "0=150" })
      const chart = CreateChart(Array.from({ length: 16 }, (_, i) => i % 2 === 0 ? "1000" : "0001"), ["1000", "0000", "0000", "0000"])
      const { round } = await Simulate(music, chart, PerfectInputs(music, chart))

      expect(new Set(Precisions(round.arrowManager.arrowMap))).toEqual(new Set([Precision.Perfect]))
    })

    // Arrows 100 ms apart, inside the tolerance window: one press must not also take the next arrow
    it("judges each press on its own arrow, on 16ths on the same arrow", async () => {
      const music = CreateMusic({ bpms: "0=150" })
      const chart = CreateChart(Array.from({ length: 16 }, (_, i) => i % 4 === 0 ? "1000" : "0000"), Array.from({ length: 16 }, () => "1000"), ["1000", "0000", "0000", "0000"])
      const { round } = await Simulate(music, chart, PerfectInputs(music, chart))

      expect(new Set(Precisions(round.arrowManager.arrowMap))).toEqual(new Set([Precision.Perfect]))
    })
  })

  describe("missing arrows", () => {
    it("misses every arrow without input, and fails the player", async () => {
      const music = CreateMusic({ bpms: "0=240" })
      const { round, announcer } = await Simulate(music, TapChart(8), [])

      expect(round.isFailed).toBe(true)
      expect(round.isFinished).toBe(false)
      expect(round.score).toBe(0)
      expect(new Set(Messages(round))).toEqual(new Set([Precision.Missed]))
      expect(announcer.PlayAnnouncer).toHaveBeenCalledWith("game_over")
      expect(announcer.PlayCrowdOneShot).toHaveBeenCalledWith("boo")
    })

    it("never fails in training mode, and does not save the stats", async () => {
      const music = CreateMusic({ bpms: "0=240" })
      const { round, userCache } = await Simulate(music, TapChart(8), [], true)

      expect(round.isFailed).toBe(false)
      expect(round.isFinished).toBe(true)
      expect(userCache.UpdateUserStatsFromRound).not.toHaveBeenCalled()
    })

    it("misses a hold released too early", async () => {
      const music = CreateMusic({ bpms: "0=120" })
      const chart = CreateChart(["2000", "0000", "0000", "0000"], ["3000", "0000", "0000", "0000"], ["1000", "0000", "0000", "0000"])
      const inputs: Input[] = [{ time: 0, direction: ArrowDirection.Left, duration: 0.5 }, { time: TimeOfBeat(music, 8), direction: ArrowDirection.Left }]
      const { round } = await Simulate(music, chart, inputs)

      expect(round.arrowManager.arrowMap[0].precision).toBe(Precision.Missed)
      expect(Messages(round)).toEqual([Precision.Perfect, Precision.Missed, Precision.Perfect])
    })
  })

  describe("several players", () => {
    it("plays each player's chart, and saves each player's stats on it", async () => {
      const music = CreateMusic({ bpms: "0=240" })
      const charts = [TapChart(1), TapChart(2)]
      charts[0].chartName = "first"
      charts[1].chartName = "second"
      const game = CreateGame(music, charts)
      const rounds = [...game.manager.gameRounds]
      await Play(game, [])

      expect(rounds.map(round => round.arrowManager.arrowMap.length)).toEqual([4, 8])
      expect(game.userCache.UpdateUserStatsFromRound).toHaveBeenCalledTimes(2)
      expect(game.userCache.UpdateUserStatsFromRound).toHaveBeenCalledWith(music.id, "first", rounds[0])
      expect(game.userCache.UpdateUserStatsFromRound).toHaveBeenCalledWith(music.id, "second", rounds[1])
    })
  })

  describe("music start", () => {
    it("gives up when the music does not start", async () => {
      const music = CreateMusic({ bpms: "0=120" })
      const game = CreateGame(music, [TapChart(1)])
      game.musicPlayer.isStuck = true
      const startedAt = performance.now()

      await expect(Play(game, [])).rejects.toThrow("The music did not start")
      expect(performance.now() - startedAt).toBeGreaterThanOrEqual(CONFIG.GAME.MUSIC_START_TIMEOUT * 1000)
      expect(game.manager.isGameOver).toBe(false)
    })

    it("stops waiting for the music without error when the game is destroyed", async () => {
      const music = CreateMusic({ bpms: "0=120" })
      const game = CreateGame(music, [TapChart(1)])
      game.musicPlayer.isStuck = true

      const started = game.manager.StartGame()
      await vi.advanceTimersByTimeAsync(1000)
      game.manager.DestroyGame()
      await vi.advanceTimersByTimeAsync(CONFIG.GAME.MUSIC_START_TIMEOUT * 1000)

      await expect(started).resolves.toBeUndefined()
      expect(game.manager.isGameOver).toBe(false)
    })
  })

  describe("end of the game", () => {
    // The high score is saved rounded: a score of 933333.33 does not beat a high score of 933333
    it("compares the rounded score with the high score", async () => {
      const music = CreateMusic({ bpms: "0=60" })
      const chart = CreateChart(["0000", "1000", "0000", "0100"], ["0010", "0000", "0000", "0000"])
      const inputs = PerfectInputs(music, chart)
      inputs[2].time += 0.05
      const game = CreateGame(music, [chart])
      const round = game.manager.gameRounds[0]
      game.manager.mainUserStats = Object.assign(new UserNoteDto(chart.chartName), { highScore: 933333 })
      await Play(game, inputs)

      expect(round.score).toBeCloseTo(CONFIG.SCORE.MAX * (2 + CONFIG.SCORE.GREAT_RATIO) / 3, 3)
      expect(game.announcer.PlayAnnouncer).not.toHaveBeenCalledWith("high_score")
    })

    it("follows the background changes, up to the last one", async () => {
      const music = CreateMusic({ bpms: "0=120", bgchanges: "0=a.png,4=b.png,8=c.png" })
      const { manager } = await Simulate(music, MIXED_CHART, PerfectInputs(music, MIXED_CHART))

      expect(manager.GetCurrentBackground()).toBe("https://c.png")
    })

    it("releases the keyboard", async () => {
      const music = CreateMusic({ bpms: "0=240" })
      const { round } = await Simulate(music, TapChart(1), [])

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }))
      expect(round.dancepad.GetRefreshedState()[ArrowDirection.Left]).toBe(ArrowState.Empty)
    })
  })

  describe("mines", () => {
    const MINE_CHART = CreateChart(["1000", "0500", "0010", "0000"], ["1000", "0000", "0000", "0000"])

    it("lets the mines pass when they are avoided", async () => {
      const music = CreateMusic({ bpms: "0=120" })
      const { round } = await Simulate(music, MINE_CHART, PerfectInputs(music, MINE_CHART))

      const mine = round.arrowManager.arrowMap[1]
      expect(mine.precision).toBeNull()
      expect(round.isFinished).toBe(true)
      expect(round.comboCount).toBe(3)
    })

    it("explodes a mine pressed on its beat, and breaks the combo", async () => {
      const music = CreateMusic({ bpms: "0=120" })
      const inputs = [...PerfectInputs(music, MINE_CHART), { time: TimeOfBeat(music, 1), direction: ArrowDirection.Down }]
      const { round } = await Simulate(music, MINE_CHART, inputs)

      expect(round.arrowManager.arrowMap[1].precision).toBe(Precision.Boom)
      expect(round.comboCount).toBe(2)
      expect(round.performance).toBe(CONFIG.PERFORMANCE.START + 3 * CONFIG.PERFORMANCE.PERFECT + CONFIG.PERFORMANCE.MINE_HIT)
    })
  })
})
