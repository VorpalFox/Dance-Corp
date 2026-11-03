import { BpmChange, ITimedChange } from "src/app/game/game-model/timeline/timedChange"
import { Measures, MusicDto } from "src/app/game/game-model/music.dto"

import { NoteEvaluator } from "./DifficultyCriteria"

/** Tokens of an SM/SSC file: text value, or a sub-map of tokens for each notedataN block */
export type SscTokenMap = Record<string, string | Record<string, string>>

export class SccReader {

  static ParseFile(filename: string, content: string): MusicDto {
    let tokenMap: SscTokenMap

    if (filename.endsWith('.sm')) {
      tokenMap = this.TokenizeSM(content)
    } else if (filename.endsWith('.ssc')) {
      tokenMap = this.TokenizeSSC(content)
    } else if (filename.endsWith('.essc')) {
      tokenMap = this.TokenizeSSC(content, true)
    } else {
      throw new Error('Unsupported file format')
    }

    const musicData = new MusicDto(tokenMap)
    console.log("Parsed Music Data:", musicData)

    const missingTags = [
      musicData.title?.trim() ? null : '#TITLE',
      musicData.artist?.trim() ? null : '#ARTIST',
      musicData.bpms.length > 0 ? null : '#BPMS',
    ].filter(tag => tag !== null)
    if (missingTags.length > 0)
      throw new Error(`This file has no ${missingTags.join(', ')}: add it to the file and load it again.`)

    const tsvLines: string[] = []
    for (const noteData of musicData.noteData) {
      if (!noteData.difficultyCriterias) {
        const evaluator = new NoteEvaluator(musicData.bpms, noteData.stepChart)
        evaluator.EvaluateCriterias()
        noteData.difficultyCriterias = evaluator.criterias
        console.log(noteData.meter, evaluator.criterias, evaluator.GetLevelFromCriterias())
        tsvLines.push(evaluator.GenerateTsvLine(musicData.title ?? "", noteData.meter))
        noteData.meter = Math.round(evaluator.GetLevelFromCriterias())
      }
    }
    if (tsvLines.length > 0) {
      // Evaluated meters: sort again, like MusicDto does with the meters of the file
      musicData.noteData.sort((a, b) => (a.meter || 0) - (b.meter || 0))
      console.log("Analysis: title | targetScore | totalSteps | doubleSteps | chainedDoubleSteps | avgBpm | maxBpm | stepWithHoldCount | sameArrowRepeatCount | offBeatStepCount | tripleStepCount | mineCount | burstVariation\n" + tsvLines.join('\n'))
    }

    return musicData
  }

  static TokenizeCommon(content: string): string[] {
    // Remove https:// 
    content = content.replace(/https?:\/\//g, '')
    // Remove single-line comments //
    content = content.replace(/\/\/.*$/gm, '')
    // Remove multi-line comments /* */
    content = content.replace(/\/\*[\s\S]*?\*\//g, '')

    // Split the content into tokens using the # symbol
    const tokenRegex = /#([\s\S]*?);/g
    const tokens: string[] = []

    let match
    while ((match = tokenRegex.exec(content)) !== null) {
      const innerToken = match[1].trim()
      tokens.push(innerToken)
    }

    return tokens
  }

  static TokenizeSSC(content: string, isEscc: boolean = false): SscTokenMap {
    const tokens = this.TokenizeCommon(content)
    const tokenMap: SscTokenMap = {}
    let currentNoteData: Record<string, string> | null = null
    let noteDataIndex = 0

    tokens.forEach(token => {
      const [key, value] = token.split(/:(.*)/s)
      const lowerKey = key.toLowerCase()

      if (lowerKey === 'notedata') {
        currentNoteData = {}
        noteDataIndex++
        tokenMap[`notedata${noteDataIndex}`] = currentNoteData
      } else if (lowerKey === 'notes' && currentNoteData) {
        const notes = isEscc ? value : SccReader.ConvertNotes(value)
        currentNoteData[lowerKey] = notes
        currentNoteData = null
      } else if (currentNoteData) {
        currentNoteData[lowerKey] = value
      } else {
        tokenMap[lowerKey] = value
      }
    })

    return tokenMap
  }

  static TokenizeSM(content: string): SscTokenMap {
    const tokens = this.TokenizeCommon(content)
    const tokenMap: SscTokenMap = {}
    let noteDataIndex = 0
    tokens.forEach(token => {
      const [key, ...rest] = token.split(":")
      const value = rest.join(":")

      const lowerKey = key.toLowerCase()

      if (lowerKey === 'notes') {
        const lines = value.split(':').map(line => line.trim())
        const currentNoteData: Record<string, string> = {}
        noteDataIndex++
        currentNoteData['stepstype'] = lines[0]
        currentNoteData['credit'] = lines[1]
        currentNoteData['difficulty'] = lines[2]
        currentNoteData['meter'] = lines[3]
        currentNoteData['notes'] = SccReader.ConvertNotes(lines[5])

        tokenMap[`notedata${noteDataIndex}`] = currentNoteData

      } else {
        tokenMap[lowerKey] = value
      }
    })

    return tokenMap
  }

  /**
   * Converts special characters in the given token according to the specified rules:
   *
   * 1 - Tap note
   * 2 - Hold head
   * 3 - Hold/roll/Minefield end
   * 4 - Roll head
   * M - Mine  -> 5
   * N - Minefield head  -> 6
   * F - Fake -> 7
   * H - Hidden -> 8
   *
   * @param token - The input token containing notes
   * @return The converted token
   */
  static ConvertNotes(token: string): string {
    return token.split('').map(char => {
      switch (char) {
        case 'M':
          return '5'
        case 'N':
          return '6'
        case 'F':
          return '7'
        case 'H':
          return '8'
        default:
          if (/[A-Za-z]/.test(char)) {
            return '0'
          }
          return char
      }
    }).join('')
  }

  static ExtractBasicMetadataFromSSC(content: string): { title?: string, artist?: string, jacket?: string, bpms?: BpmChange[] } {
    const tokens = SccReader.TokenizeCommon(content)
    const result: { title?: string, artist?: string, jacket?: string, bpms?: BpmChange[] } = {}

    for (const token of tokens) {
      // A token without a colon has no value
      const [rawKey, rawValue] = token.split(/:(.*)/s) as [string, string?]
      const key = rawKey.toLowerCase().trim()
      const value = rawValue?.trim()

      if (key === 'title' || key === 'artist' || key === 'jacket') {
        result[key] = value
      }

      if (key === 'bpms' && value) {
        result.bpms = value.split(',').map((v: string) => {
          const [time, bpm] = v.split('=')
          return { time: parseFloat(time), value: parseFloat(bpm) }
        })
      }

      if (result.title && result.artist && result.jacket) {
        return result
      }
    }

    return result
  }

}

export class SccWriter {
  static GetOrderedFields(dto: object): [string, unknown][] {
    return Object.entries(dto)
  }

  static WriteSscFile(dto: MusicDto): string {
    let esscContent = ''
    const fileFields = SccWriter.GetOrderedFields(dto).filter(([key]) => key !== 'noteData' && key !== 'additionalFields')
    for (const [key, value] of fileFields) {
      esscContent += `#${key.toUpperCase()}:`
      esscContent += this.WriteEsscValue(value)
      esscContent += ';\n'
    }
    esscContent += '\n'

    let count = 0
    for (const noteData of dto.noteData) {
      esscContent += `//--------------- Dance ${count} / ${dto.noteData.length} ----------------\n#NOTEDATA:;\n`
      for (const [subKey, subValue] of Object.entries(noteData).filter(([key]) => key !== 'stepChart')) {
        esscContent += `#${subKey.toUpperCase()}:`
        esscContent += this.WriteEsscValue(subValue)
        esscContent += `;\n`
      }
      esscContent += `#NOTES:\n`
      esscContent += noteData.stepChart.map((measure: Measures) => measure.steps.map(row => row.join('')).join('\n')).join('\n,\n')
      esscContent += `\n;\n\n`
      count++
    }
    return esscContent
  }

  private static WriteEsscValue(value: unknown): string {
    if (value === undefined || value === null)
      return ''
    if (Array.isArray(value) && value[0]) {
      return value.map((v: ITimedChange) => v.time.toFixed(3) + '=' + v.value).join(',')
    }

    if (value instanceof Date) {
      return value.toISOString().split('T')[0]
    }

    return String(value)
  }
}

export function SanitizeSscInput(input: string | null): string | null {
  if (!input || input.trim() === "") return null

  // Remove http:// or https://
  input = input.replace(/^https?:\/\//i, "")
  // Remove all remaining // in the string
  input = input.replace(/\/{2,}/g, "/")
  // Replace ; with ,
  input = input.replace(/;/g, ",")

  return input
}