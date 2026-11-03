import { DifficultyCriteria, NoteEvaluator } from "src/app/pages/upload/DifficultyCriteria"
import { describe, expect, it } from "vitest"

import { BpmChange } from "src/app/game/game-model/timeline/timedChange"
import { Measures } from "src/app/game/game-model/music.dto"

// Each measure is written as rows of digits, like in a chart file
function CreateEvaluator(bpms: BpmChange[], ...measures: string[][]): NoteEvaluator {
  const stepChart = measures.map(rows => {
    const measure = new Measures()
    measure.steps = rows.map(row => row.split("").map(Number))
    return measure
  })
  return new NoteEvaluator(bpms, stepChart)
}

describe("DifficultyCriteria", () => {
  it("writes and reads back its values", () => {
    const criteria = Object.assign(new DifficultyCriteria(), { endurance: 1.5, speed: 120.25, technical: 3, burst: 0.75, chaos: 0 })
    expect(DifficultyCriteria.ParseCriteria(criteria.toString())).toEqual(criteria)
  })

  it("ignores the unknown keys and the spaces", () => {
    expect(DifficultyCriteria.ParseCriteria(" e=2, x=9").endurance).toBe(2)
  })
})

describe("NoteEvaluator", () => {
  const BPM_120 = [new BpmChange(0, 120)]

  it("counts the steps, the jumps and the chained jumps", () => {
    // Jumps on rows 0, 2 and 7: the first two are chained, the third is too far
    const evaluator = CreateEvaluator(BPM_120, ["1100", "1000", "0011", "0000", "0000", "0000", "0000", "1001"])
    evaluator.EvaluateEndurance()
    expect(evaluator.totalSteps).toBe(4)
    expect(evaluator.doubleSteps).toBe(3)
    expect(evaluator.chainedDoubleSteps).toBe(1)
  })

  it("does not count the mines and the hold tails as steps", () => {
    const evaluator = CreateEvaluator(BPM_120, ["2000", "0500", "3000", "0000"])
    evaluator.EvaluateEndurance()
    expect(evaluator.totalSteps).toBe(1)
  })

  it("averages the BPM over the time spent at each BPM", () => {
    // 4 beats at 120 BPM (2 s), then 4 beats at 240 BPM (1 s)
    const evaluator = CreateEvaluator([new BpmChange(0, 120), new BpmChange(4, 240)], ["1000", "0000", "0000", "0000"], ["1000", "0000", "0000", "0000"])
    evaluator.EvaluateSpeed()
    expect(evaluator.avgBpm).toBe(160)
    expect(evaluator.maxBpm).toBeCloseTo(240 * Math.pow(1 / 3, 0.3))
  })

  it("ignores the BPM changes after the end of the chart", () => {
    const evaluator = CreateEvaluator([new BpmChange(0, 120), new BpmChange(8, 240)], ["1000", "0000", "0000", "0000"])
    expect(evaluator.EvaluateSpeed()).not.toBeNaN()
    expect(evaluator.avgBpm).toBe(120)
  })

  it("counts the technical patterns", () => {
    const evaluator = CreateEvaluator(BPM_120, [
      "2000", "0100", // hold, then a step during it
      "3000", "0100",
      "1110", "1111", // triple, then quad
      "5000", "0000",
    ])
    evaluator.EvaluateTechnical()
    expect(evaluator.stepWithHoldCount).toBe(2)
    expect(evaluator.sameArrowRepeatCount).toBe(4)
    expect(evaluator.tripleStepCount).toBe(5)
    expect(evaluator.mineCount).toBe(1)
    // 8th notes are not off-beat
    expect(evaluator.offBeatStepCount).toBe(0)
  })

  it("counts the 16th notes as off-beat", () => {
    const evaluator = CreateEvaluator(BPM_120, ["1000", "0100", "0010", "0001", ...Array(12).fill("0000")])
    evaluator.EvaluateTechnical()
    expect(evaluator.offBeatStepCount).toBe(2)
  })

  it("gives more burst to irregular gaps than to regular ones", () => {
    const regular = CreateEvaluator(BPM_120, ["1000", "0000", "0100", "0000"], ["1000", "0000", "0100", "0000"])
    const irregular = CreateEvaluator(BPM_120, ["1000", "0100", "0000", "0000"], ["0000", "0000", "0000", "0100"])
    expect(irregular.EvaluateBurst()).toBeGreaterThan(regular.EvaluateBurst())
  })

  it("gives no burst to a chart with a step on every row", () => {
    const evaluator = CreateEvaluator(BPM_120, ["1000", "0100", "0010", "0001"])
    expect(evaluator.EvaluateBurst()).toBe(0)
  })

  it("gives a level from the criterias", () => {
    const evaluator = CreateEvaluator(BPM_120, ["1000", "0000", "0100", "0000"], ["1000", "0010", "0100", "0001"])
    evaluator.EvaluateCriterias()
    expect(evaluator.GetLevelFromCriterias()).toBeGreaterThan(0)
  })
})
