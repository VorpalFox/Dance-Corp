import { SanitizeSscInput, SccReader, SccWriter } from "src/app/pages/upload/reader.ssc"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { DanceType } from "src/app/game/constants/dance-type.enum"
import { MusicDto, NoteDataDto } from "src/app/game/game-model/music.dto"
import { NoteDifficulty } from "src/app/game/constants/note-difficulty.enum"
import { ReadChart } from "../../fixtures/fixtures"

describe("SccReader", () => {
  beforeEach(() => {
    // ParseFile logs the parsed data and the difficulty analysis
    vi.spyOn(console, "log").mockImplementation(() => undefined)
  })

  describe("ParseFile (.ssc)", () => {
    let music: MusicDto

    beforeEach(() => {
      music = SccReader.ParseFile("two-charts.ssc", ReadChart("two-charts.ssc"))
    })

    it("reads the metadata", () => {
      expect(music.title).toBe("Test Song")
      expect(music.subtitle).toBe("")
      expect(music.artist).toBe("Test Artist")
      expect(music.credit).toBe("Fx")
      expect(music.banner).toBe("banner.png")
      expect(music.jacket).toBe("jacket.png")
      expect(music.music).toBe("song.ogg")
      expect(music.offset).toBe(-0.1)
      expect(music.sampleStart).toBe(30)
      expect(music.sampleLength).toBe(12)
      expect(music.musicoffset).toBeUndefined()
    })

    it("reads the timed changes and merges the delays into the stops", () => {
      expect(music.bpms).toEqual([{ time: 0, value: 120 }, { time: 8, value: 240 }])
      expect(music.stops).toEqual([{ time: 4, value: 0.5 }, { time: 6, value: 0.25 }])
      expect(music.bgChanges).toEqual([])
    })

    it("keeps the unknown tags, without the ignored and empty ones", () => {
      expect(music.additionalFields).toEqual({ version: "0.83" })
    })

    // The meters are evaluated, so the order of the charts may change: find them by difficulty
    function Chart(difficulty: NoteDifficulty): NoteDataDto {
      return music.noteData.find(chart => chart.difficulty === difficulty)!
    }

    it("reads every chart, sorted by their final meter", () => {
      expect(music.noteData.map(n => n.difficulty).sort()).toEqual([NoteDifficulty.Basic, NoteDifficulty.Expert].sort())
      const meters = music.noteData.map(n => n.meter)
      expect(meters).toEqual([...meters].sort((a, b) => a - b))
    })

    it("reads the chart tags", () => {
      const chart = Chart(NoteDifficulty.Expert)
      expect(chart.chartName).toBe("My Chart")
      expect(chart.stepsType).toBe(DanceType.DanceSingle)
      expect(chart.description).toBe("Test")
      expect(chart.credit).toBe("Fx")
    })

    it("names a chart without a name from its difficulty, meter and type", () => {
      expect(Chart(NoteDifficulty.Basic).chartName).toMatch(/^Easy_\d+_S_\d{4}-\d{2}-\d{2}$/)
    })

    it("reads the notes measure by measure, mines converted", () => {
      expect(Chart(NoteDifficulty.Expert).stepChart.map(m => m.steps)).toEqual([
        [[1, 0, 0, 0], [0, 0, 0, 0], [0, 1, 1, 0], [0, 0, 0, 1]],
        [[2, 0, 0, 0], [0, 0, 0, 0], [3, 0, 0, 0], [5, 0, 0, 0]],
      ])
    })

    it("evaluates the difficulty of the charts without criterias, and replaces their meter", () => {
      for (const chart of music.noteData) {
        expect(chart.difficultyCriterias).toBeDefined()
        expect(Number.isInteger(chart.meter)).toBe(true)
      }
    })
  })

  describe("ParseFile (.sm)", () => {
    let music: MusicDto

    beforeEach(() => {
      music = SccReader.ParseFile("one-chart.sm", ReadChart("one-chart.sm"))
    })

    it("reads the metadata", () => {
      expect(music.title).toBe("Old Song")
      expect(music.artist).toBe("Old Artist")
      expect(music.offset).toBe(0.05)
      expect(music.bpms).toEqual([{ time: 0, value: 150 }])
      expect(music.stops).toEqual([])
    })

    it("turns the background into a background change at beat 0", () => {
      expect(music.bgChanges).toEqual([{ time: 0, value: "bg.png" }])
    })

    it("reads the chart from the #NOTES fields", () => {
      expect(music.noteData).toHaveLength(1)
      const chart = music.noteData[0]
      expect(chart.stepsType).toBe(DanceType.DanceSingle)
      expect(chart.difficulty).toBe(NoteDifficulty.Challenge)
      // Mine converted to 5, fake converted to 7
      expect(chart.stepChart[0].steps).toEqual([[1, 0, 0, 0], [0, 5, 0, 0], [0, 0, 1, 0], [0, 0, 0, 7]])
    })

    it("reads the chart credit", () => {
      expect(music.noteData[0].credit).toBe("Fx")
    })
  })

  describe("ParseFile (evaluated meters)", () => {
    it("sorts the charts by their evaluated meter", () => {
      const dense = Array(4).fill("1100\n1100\n1100\n1100").join("\n,\n")
      const content = `#TITLE:A;\n#ARTIST:B;\n#BPMS:0=120;\n`
        + `#NOTEDATA:;\n#CHARTNAME:dense;\n#STEPSTYPE:dance-single;\n#METER:1;\n#NOTES:\n${dense}\n;\n`
        + `#NOTEDATA:;\n#CHARTNAME:light;\n#STEPSTYPE:dance-single;\n#METER:10;\n#NOTES:\n1000\n0000\n0000\n0000\n;\n`
      const music = SccReader.ParseFile("song.ssc", content)

      expect(music.noteData.map(chart => chart.chartName)).toEqual(["light", "dense"])
      expect(music.noteData[0].meter).toBeLessThan(music.noteData[1].meter)
    })
  })

  describe("ParseFile (errors)", () => {
    it("rejects an unknown extension", () => {
      expect(() => SccReader.ParseFile("chart.txt", "")).toThrow("Unsupported file format")
    })

    it("names the missing required tags", () => {
      expect(() => SccReader.ParseFile("no-title.ssc", ReadChart("no-title.ssc"))).toThrow("#TITLE")
    })

    it("names a missing artist", () => {
      expect(() => SccReader.ParseFile("song.ssc", "#TITLE:A;\n#BPMS:0=120;")).toThrow("This file has no #ARTIST")
    })

    it("names missing or empty bpms", () => {
      expect(() => SccReader.ParseFile("song.ssc", "#TITLE:A;\n#ARTIST:B;")).toThrow("This file has no #BPMS")
      expect(() => SccReader.ParseFile("song.ssc", "#TITLE:A;\n#ARTIST:B;\n#BPMS:;")).toThrow("This file has no #BPMS")
      expect(() => SccReader.ParseFile("song.sm", "#TITLE:A;\n#ARTIST:B;\n#BPMS:;")).toThrow("This file has no #BPMS")
    })
  })

  describe("TokenizeCommon", () => {
    it("ignores the comments", () => {
      const content = "#TITLE:A; // #ARTIST:B;\n/* #GENRE:C; */\n#CREDIT:D;"
      expect(SccReader.TokenizeCommon(content)).toEqual(["TITLE:A", "CREDIT:D"])
    })

    it("keeps an URL without its protocol, instead of cutting it as a comment", () => {
      expect(SccReader.TokenizeCommon("#MUSIC:https://example.com/song.ogg;")).toEqual(["MUSIC:example.com/song.ogg"])
    })
  })

  describe("ConvertNotes", () => {
    it("converts the letter notes to digits, and the unknown ones to empty", () => {
      expect(SccReader.ConvertNotes("12340MNFHKL")).toBe("12340567800")
    })

    it("keeps the separators", () => {
      expect(SccReader.ConvertNotes("1000\n,\n0001")).toBe("1000\n,\n0001")
    })
  })

  describe("ExtractBasicMetadataFromSSC", () => {
    it("reads the title, the artist, the jacket and the bpms", () => {
      const content = "#TITLE:A;\n#ARTIST:B;\n#BPMS:0=120,4=180;\n#JACKET:c.png;"
      expect(SccReader.ExtractBasicMetadataFromSSC(content)).toEqual({
        title: "A",
        artist: "B",
        jacket: "c.png",
        bpms: [{ time: 0, value: 120 }, { time: 4, value: 180 }],
      })
    })

    it("accepts a tag without value", () => {
      expect(SccReader.ExtractBasicMetadataFromSSC("#TITLE;\n#ARTIST:B;")).toEqual({ title: undefined, artist: "B" })
    })
  })
})

describe("SccWriter", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined)
  })

  it("writes a file that reads back to the same music", () => {
    const music = SccReader.ParseFile("two-charts.ssc", ReadChart("two-charts.ssc"))
    // The creation date is written without its time
    for (const chart of music.noteData) {
      chart.creationDate = new Date("2024-05-01")
    }

    const reread = SccReader.ParseFile("two-charts.essc", SccWriter.WriteSscFile(music))

    // The unknown tags are not written, a missing tag is written empty: it reads back as "",
    // and the charts are sorted again by their evaluated meter
    function Normalize(m: MusicDto): unknown {
      const noteData = [...m.noteData].sort((a, b) => a.chartName.localeCompare(b.chartName))
      return JSON.parse(JSON.stringify({ ...m, noteData, additionalFields: undefined }, (key, value) => value === "" ? undefined : value))
    }
    expect(Normalize(reread)).toEqual(Normalize(music))
  })

  it("writes the difficulty criterias of an edited copy (DeepClone)", () => {
    const music = SccReader.ParseFile("two-charts.ssc", ReadChart("two-charts.ssc"))
    const content = SccWriter.WriteSscFile(music.DeepClone())

    expect(content).not.toContain("[object Object]")
  })
})

describe("SanitizeSscInput", () => {
  it("returns null for an empty input", () => {
    expect(SanitizeSscInput(null)).toBeNull()
    expect(SanitizeSscInput("   ")).toBeNull()
  })

  it("removes what would break the file: protocol, comment and tag end", () => {
    expect(SanitizeSscInput("https://site.com//a;b")).toBe("site.com/a,b")
  })
})
