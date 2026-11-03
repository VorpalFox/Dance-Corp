import { Measures, MusicDto, NoteDataDto } from "src/app/game/game-model/music.dto"
import { describe, expect, it } from "vitest"

import { DanceType } from "src/app/game/constants/dance-type.enum"
import { DifficultyCriteria } from "src/app/pages/upload/DifficultyCriteria"
import { NoteDifficulty } from "src/app/game/constants/note-difficulty.enum"

function CreateMusic(): MusicDto {
  return new MusicDto({
    title: "Title",
    artist: "Artist",
    bpms: "0=120",
    notedata1: { stepstype: "dance-single", difficulty: "hard", meter: "9", difficultycriterias: "e=1,s=2,t=3,b=4,c=0", notes: "1000\n0000\n0000\n0000" },
  })
}

describe("MusicDto", () => {
  describe("id", () => {
    it("joins the artist and the title, lowercase without spaces or slashes", () => {
      const music = new MusicDto()
      music.artist = " AC/DC "
      music.title = "Back In  Black"
      expect(music.id).toBe("ac\\dc-back_in_black")
    })

    it("throws without artist or title", () => {
      const music = new MusicDto()
      music.title = "Title"
      expect(() => music.id).toThrow()
    })
  })

  describe("constructor", () => {
    it("takes the jacket from the cd image, then the disc image", () => {
      expect(new MusicDto({ cdimage: "cd.png", discimage: "disc.png" }).jacket).toBe("cd.png")
      expect(new MusicDto({ discimage: "disc.png" }).jacket).toBe("disc.png")
      expect(new MusicDto({ jacket: "j.png", cdimage: "cd.png" }).jacket).toBe("j.png")
    })

    it("merges the delays into the stops, sorted by beat", () => {
      const music = new MusicDto({ stops: "8=0.5", delays: "2=0.1" })
      expect(music.stops).toEqual([{ time: 2, value: 0.1 }, { time: 8, value: 0.5 }])
    })

    it("puts the background and foreground before their changes", () => {
      const music = new MusicDto({ background: "bg.png", bgchanges: "4=other.png", foreground: "fg.png" })
      expect(music.bgChanges).toEqual([{ time: 0, value: "bg.png" }, { time: 4, value: "other.png" }])
      expect(music.fgChanges).toEqual([{ time: 0, value: "fg.png" }])
    })

    it("defaults the offset to 0", () => {
      expect(new MusicDto({}).offset).toBe(0)
    })
  })

  describe("DeepClone", () => {
    it("rebuilds the nested instances", () => {
      const clone = CreateMusic().DeepClone()
      expect(clone).toBeInstanceOf(MusicDto)
      expect(clone.noteData[0]).toBeInstanceOf(NoteDataDto)
      expect(clone.noteData[0].stepChart[0]).toBeInstanceOf(Measures)
    })

    it("copies without sharing the charts", () => {
      const music = CreateMusic()
      const clone = music.DeepClone()
      clone.noteData[0].stepChart[0].steps[0][0] = 0
      expect(music.noteData[0].stepChart[0].steps[0][0]).toBe(1)
    })

    it("keeps the creation date a Date and the criterias a DifficultyCriteria", () => {
      const chart = CreateMusic().DeepClone().noteData[0]
      expect(chart.creationDate).toBeInstanceOf(Date)
      expect(chart.difficultyCriterias).toBeInstanceOf(DifficultyCriteria)
    })
  })
})

describe("NoteDataDto", () => {
  it("reads the chart tags", () => {
    const chart = new NoteDataDto({ chartname: " Name ", stepstype: "dance-double", description: "D", difficulty: " Medium ", meter: "7", creatorid: "uid", creationdate: "2024-05-01" })
    expect(chart.chartName).toBe("Name")
    expect(chart.stepsType).toBe(DanceType.DanceDouble)
    expect(chart.description).toBe("D")
    expect(chart.difficulty).toBe(NoteDifficulty.Difficult)
    expect(chart.meter).toBe(7)
    expect(chart.creatorId).toBe("uid")
    expect(chart.creationDate).toEqual(new Date("2024-05-01"))
  })

  it("defaults an unknown difficulty to Challenge", () => {
    expect(new NoteDataDto({ difficulty: "unknown" }).difficulty).toBe(NoteDifficulty.Challenge)
  })

  it("reads the difficulty criterias", () => {
    expect(new NoteDataDto({ difficultycriterias: "e=1,s=2,t=3,b=4,c=5" }).difficultyCriterias).toEqual(Object.assign(new DifficultyCriteria(), { endurance: 1, speed: 2, technical: 3, burst: 4, chaos: 5 }))
  })

  it("names a chart without a name", () => {
    expect(new NoteDataDto({ difficulty: "easy", meter: "3", stepstype: "dance-double", creationdate: "2024-05-01" }).chartName).toBe("Easy_3_D_2024-05-01")
  })
})
