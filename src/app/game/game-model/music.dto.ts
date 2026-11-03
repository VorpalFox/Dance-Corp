import { BackgroundChange, BpmChange, ITimedChange, LabelChange, ScrollChange, SpeedChange, StopChange, WarpChange } from "./timeline/timedChange"
import { NoteDifficulty, difficultyMap } from "../constants/note-difficulty.enum"

import { DanceType } from "../constants/dance-type.enum"
import { DifficultyCriteria } from "src/app/pages/upload/DifficultyCriteria"
import type { SscTokenMap } from "src/app/pages/upload/reader.ssc"

export class MusicDto {
  title?: string
  titletranslit?: string
  subtitle?: string
  subtitletranslit?: string
  artist?: string
  artisttranslit?: string
  genre?: string
  credit?: string
  banner?: string
  jacket?: string
  cdTitle?: string
  music?: string
  offset: number = 0 //beat0OffsetInSeconds
  musicoffset?: number //musicOffsetInSeconds 
  sampleStart?: number
  sampleLength?: number
  bpms: BpmChange[] = []
  stops: StopChange[] = []
  warps: WarpChange[] = []
  speeds: SpeedChange[] = []
  scrolls: ScrollChange[] = []
  bgChanges: BackgroundChange[] = []
  fgChanges: BackgroundChange[] = []
  labels: LabelChange[] = []
  noteData: NoteDataDto[] = []
  additionalFields?: Record<string, string>

  get id(): string {
    function Sanitize(s: string) {
      return s.trim().toLowerCase()
        .replace(/\//g, '\\')   // replace slash with backslash
        .replace(/\s+/g, '_')  // replace spaces with underscores
    }

    // Checked when a file is read (SccReader.ParseFile)
    if (!this.artist || !this.title) throw new Error("A music needs an artist and a title")
    return `${Sanitize(this.artist)}-${Sanitize(this.title)}`
  }

  constructor(tokenMapWithNotes?: SscTokenMap) {
    if (tokenMapWithNotes === undefined) return
    // notedataN blocks (sub-maps) are read separately, below
    // A tag missing from the file has no entry
    const tokenMap = tokenMapWithNotes as Partial<Record<string, string>>

    this.title = tokenMap["title"]
    delete tokenMap["title"]
    this.titletranslit = tokenMap["titletranslit"]
    delete tokenMap["titletranslit"]
    this.subtitle = tokenMap["subtitle"]
    delete tokenMap["subtitle"]
    this.subtitletranslit = tokenMap["subtitletranslit"]
    delete tokenMap["subtitletranslit"]
    this.artist = tokenMap["artist"]
    delete tokenMap["artist"]
    this.artisttranslit = tokenMap["artisttranslit"]
    delete tokenMap["artisttranslit"]
    this.genre = tokenMap["genre"]
    delete tokenMap["genre"]
    this.credit = tokenMap["credit"]
    delete tokenMap["credit"]
    this.banner = tokenMap["banner"]
    delete tokenMap["banner"]
    this.jacket = tokenMap["jacket"]
    delete tokenMap["jacket"]
    if (this.jacket === undefined) this.jacket = tokenMap["cdimage"]
    delete tokenMap["cdimage"]
    if (this.jacket === undefined) this.jacket = tokenMap["discimage"]
    delete tokenMap["discimage"]
    this.cdTitle = tokenMap["cdtitle"]
    delete tokenMap["cdtitle"]
    this.music = tokenMap["music"]
    delete tokenMap["music"]
    this.offset = tokenMap["offset"] ? parseFloat(tokenMap["offset"]) : 0
    delete tokenMap["offset"]
    this.musicoffset = tokenMap["musicoffset"] ? parseFloat(tokenMap["musicoffset"]) : undefined
    delete tokenMap["musicoffset"]
    this.sampleStart = tokenMap["samplestart"] ? parseFloat(tokenMap["samplestart"]) : undefined
    delete tokenMap["samplestart"]
    this.sampleLength = tokenMap["samplelength"] ? parseFloat(tokenMap["samplelength"]) : undefined
    delete tokenMap["samplelength"]
    this.stops = this.ParseChanges<StopChange>(tokenMap["stops"], v => parseFloat(v)) ?? []
    delete tokenMap["stops"]
    this.warps = this.ParseChanges<WarpChange>(tokenMap["warps"], v => parseFloat(v)) ?? []
    delete tokenMap["warps"]
    this.speeds = this.ParseChanges<SpeedChange>(tokenMap["speeds"], v => parseFloat(v)) ?? []
    delete tokenMap["speeds"]
    this.scrolls = this.ParseChanges<ScrollChange>(tokenMap["scrolls"], v => parseFloat(v)) ?? []
    delete tokenMap["scrolls"]
    this.bpms = this.ParseChanges<BpmChange>(tokenMap["bpms"], v => parseFloat(v)) ?? []
    delete tokenMap["bpms"]
    const bgChange0 = tokenMap["background"]
    this.bgChanges = this.ParseChanges<BackgroundChange>(tokenMap["bgchanges"], v => v) ?? []
    if (bgChange0)
      this.bgChanges.unshift(new BackgroundChange(0, bgChange0))
    delete tokenMap["background"]
    delete tokenMap["bgchanges"]
    const fgChange0 = tokenMap["foreground"]
    this.fgChanges = this.ParseChanges<BackgroundChange>(tokenMap["fgchanges"], v => v) ?? []
    if (fgChange0)
      this.fgChanges.unshift(new BackgroundChange(0, fgChange0))
    delete tokenMap["foreground"]
    delete tokenMap["fgchanges"]
    this.labels = this.ParseChanges<LabelChange>(tokenMap["labels"], v => v) ?? []
    delete tokenMap["labels"]

    const parsedDelays = this.ParseChanges<StopChange>(tokenMap["delays"], v => parseFloat(v)) ?? []
    delete tokenMap["delays"]

    Object.keys(tokenMap).forEach(key => {
      if (key.startsWith('notedata')) {
        this.noteData.push(new NoteDataDto(tokenMapWithNotes[key] as Record<string, string>))
        delete tokenMap[key]
      }
    })
    this.noteData.sort((a, b) => (a.meter || 0) - (b.meter || 0))

    if (parsedDelays.length > 0) {
      this.stops.push(...parsedDelays)
      this.stops.sort((a, b) => a.time - b.time)
    }

    const toRemoveTokens = ['selectable', 'tickcounts']
    const leftTokens = Object.fromEntries(
      Object.entries(tokenMap).filter((entry): entry is [string, string] =>
        !toRemoveTokens.includes(entry[0]) &&
        entry[1] !== undefined &&
        !(typeof entry[1] === "string" && entry[1].trim() === "")
      )
    )
    this.additionalFields = { ...leftTokens }
  }

  private ParseChanges<T extends ITimedChange>(token: string | undefined, parsefun: (value: string) => T['value']): T[] | undefined {
    if (!token) return undefined
    const changes = token.split(',')
    const array: T[] = []
    for (const change of changes) {
      const [timeStr, valueStr] = change.split('=')
      const time = parseFloat(timeStr)
      const value = parsefun(valueStr)
      array.push({ value, time } as T)
    }

    return array
  }

  DeepClone(): MusicDto {
    return MusicDto.FromJSON(JSON.parse(JSON.stringify(this)))
  }

  //#region Statics
  static FromJSON(obj: Record<string, unknown>): MusicDto {
    const instance = Object.assign(new MusicDto(), obj)
    const noteData = obj["noteData"]
    instance.noteData = Array.isArray(noteData)
      ? noteData.map((n: Record<string, unknown>) => NoteDataDto.FromJSON(n))
      : []
    return instance
  }
  //#endregion
}

export class NoteDataDto {
  chartName: string = "NoChartNameError"
  stepsType: DanceType = DanceType.DanceSingle
  description?: string
  chartStyle?: string
  difficulty: NoteDifficulty = NoteDifficulty.Challenge
  meter: number = 0
  difficultyCriterias?: DifficultyCriteria
  credit?: string
  creatorId?: string
  creationDate: Date = new Date()
  stepChart: Measures[] = []

  // A tag missing from the chart has no entry
  constructor(tokenMap?: Partial<Record<string, string>>) {
    if (tokenMap === undefined) return

    this.stepsType = tokenMap["stepstype"] as DanceType
    this.description = tokenMap["description"]
    this.chartStyle = tokenMap["chartstyle"]
    const difficulty = (tokenMap["difficulty"] ?? "").toLowerCase().trim()
    this.difficulty = difficultyMap[difficulty] || NoteDifficulty.Challenge

    this.meter = tokenMap["meter"] ? parseInt(tokenMap["meter"]) : 0
    this.credit = tokenMap["credit"]
    this.creatorId = tokenMap["creatorid"]
    const creationDateValue = tokenMap["creationdate"]
    this.creationDate = creationDateValue ? new Date(creationDateValue) : new Date()
    this.chartName = tokenMap["chartname"]?.trim() || `${this.difficulty}_${this.meter}_${this.stepsType === DanceType.DanceSingle ? 'S' : 'D'}_${this.creationDate.toISOString().split('T')[0]}`

    this.stepChart = (tokenMap["notes"] ?? "").split(',').map(measure => {
      const measureInstance = new Measures()
      measureInstance.steps = measure.trim().split('\n').map(line => line.trim().split('').map(step => parseInt(step)))
      return measureInstance
    })
    this.difficultyCriterias = tokenMap["difficultycriterias"] ? DifficultyCriteria.ParseCriteria(tokenMap["difficultycriterias"]) : undefined

  }

  //#region Statics
  static FromJSON(obj: Record<string, unknown>): NoteDataDto {
    const instance = Object.assign(new NoteDataDto(), obj)
    const stepChart = obj["stepChart"]
    instance.stepChart = Array.isArray(stepChart)
      ? stepChart.map((n: Record<string, unknown>) => Measures.FromJSON(n))
      : []
    // JSON.stringify writes the date as an ISO string
    const creationDate = obj["creationDate"]
    if (typeof creationDate === "string")
      instance.creationDate = new Date(creationDate)
    const difficultyCriterias = obj["difficultyCriterias"]
    instance.difficultyCriterias = typeof difficultyCriterias === "object" && difficultyCriterias !== null
      ? Object.assign(new DifficultyCriteria(), difficultyCriterias)
      : undefined
    return instance
  }
  //#endregion
}

export class Measures {
  steps: number[][] = []

  //#region Statics
  static FromJSON(obj: Record<string, unknown>): Measures {
    const instance = Object.assign(new Measures(), obj)
    const steps = obj["steps"]
    instance.steps = Array.isArray(steps) ? steps.map((row: unknown) => Array.isArray(row) ? row.map(Number) : []) : []
    return instance
  }
  //#endregion
}
