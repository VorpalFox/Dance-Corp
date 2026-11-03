import { ArrowState, DancePadInput, IDancePad } from "../game-controller/dancepad.interface"

import { AnnouncerService } from 'src/app/services/gameplay/announcer.service'
import { Arrow } from "./arrows/arrow"
import { ArrowDirection } from 'src/app/game/constants/arrow-direction.enum'
import { ArrowManager } from './arrows/arrowManager'
import { ArrowType } from "../constants/arrow-type.enum"
import { CONFIG } from './../constants/game-config'
import { CreateDancePad } from "../game-controller/dancepad.factory"
import { NoteDataDto } from "./music.dto"
import { Precision } from "../constants/precision.enum"
import { Player } from "./player"
import { SatisfactionType } from "../constants/satisfaction-type.enum"
import { SoundService } from 'src/app/services/gameplay/sound.service'

export type PrecisionMessage = {
    direction: ArrowDirection
    precision: Precision
}

export class GameRound {
    //#region App Constants
    readonly ArrowDirection = ArrowDirection
    //#endregion

    // Sound
    private mineHitSound = new Audio('assets/Sounds/gameFx/player_mine.mp3')

    //Game Data
    arrowManager: ArrowManager

    //Player Data
    public player: Player
    dancepad: IDancePad

    //Game variables
    private isTrainingMode = false
    public score: number = 0
    public performance: number = CONFIG.PERFORMANCE.START
    public currentArrowIndex: number = 0 // Tracks the last note out of game
    public isFailed = false
    public isFinished = false
    public comboCount: number = 0
    public level: number = 1

    private scorePerArrow: number = 0
    private scorePerHoldBeat: number = 0

    //Display consuming
    precisionMessage: PrecisionMessage[] = [] // Message to display on the screen
    currentBeat: number = 0 // Current beat in the game to display

    constructor(notes: NoteDataDto, player: Player, isTrainingMode = false, private announcerService: AnnouncerService) {
        this.player = player

        this.dancepad = CreateDancePad(player)

        this.level = notes.meter
        this.arrowManager = new ArrowManager(notes)

        this.CalculateScore()

        if (isTrainingMode) {
            this.isTrainingMode = true
            this.performance = CONFIG.PERFORMANCE.MAX
        }
    }

    private CalculateScore() {
        const arrowMap = this.arrowManager.arrowMap
        const holdArrows = arrowMap.filter(arrow => arrow.type === ArrowType.Hold)
        // A hold head is judged like a tap: it scores like one, then its hold beats
        const tapArrows = arrowMap.filter(arrow => arrow.type === ArrowType.Tap || arrow.type === ArrowType.Hold)

        // Calculate total hold percentage for score
        const totalHoldTime = holdArrows.reduce((total, arrow) => total + arrow.holdLength, 0)
        const totalTaps = tapArrows.length
        const totalWeight = totalTaps + totalHoldTime

        // Point attribution
        const tapPoints = CONFIG.SCORE.MAX * (totalTaps / totalWeight)
        const holdPoints = CONFIG.SCORE.MAX * (totalHoldTime / totalWeight)

        this.scorePerArrow = tapPoints / totalTaps
        this.scorePerHoldBeat = holdPoints / totalHoldTime

    }

    public GameLoop(currentBeat: number, tolerance: number): void {
        const arrowMap = this.arrowManager.arrowMap
        this.currentBeat = currentBeat

        // Get DancePad state, copied: a press is consumed below without changing the exposed state
        const padstate: DancePadInput = [...this.dancepad.GetRefreshedState()]

        if (this.isFinished)
            return

        // Check arrows
        let currentArrowCheck = this.currentArrowIndex
        while (currentArrowCheck < arrowMap.length && arrowMap[currentArrowCheck].beatPosition < currentBeat + tolerance) {
            const arrow = arrowMap[currentArrowCheck]
            if (!arrow.isOut) {
                const precision = arrow.precision
                this.CheckArrowPress(arrow, currentBeat, padstate[arrow.direction], tolerance)
                // One press judges one arrow: the next arrows of its direction see it held
                if (precision === null && GameRound.IsPressJudgment(arrow.precision) && padstate[arrow.direction] === ArrowState.Press)
                    padstate[arrow.direction] = ArrowState.Hold
            }
            currentArrowCheck++
        }

        // Pass out arrows
        while (arrowMap[this.currentArrowIndex].isOut) {
            this.currentArrowIndex++
            if (this.currentArrowIndex >= arrowMap.length) {
                this.EndVictory()
                return
            }
        }

        //Check Fail
        if (this.performance <= 0) {
            this.EndFail()
            return
        }
    }

    private CheckArrowPress(arrow: Arrow, currentBeat: number, padArrowState: ArrowState, tolerance: number) {
        if (arrow.type === ArrowType.Mine) {
            if (!arrow.isPressed && padArrowState === ArrowState.Press) {
                this.MineHit(arrow)
            } else {
                if (currentBeat > arrow.beatPosition + CONFIG.JUDGMENT.MINE_PASS_DELAY) {
                    this.MinePassed(arrow)
                }
            }
            return
        }

        if (arrow.type === ArrowType.Hold && arrow.isPressed) {
            if (arrow.beatEnd !== null && currentBeat > arrow.beatEnd) {
                this.ArrowOk(arrow)
                return
            }

            if (padArrowState !== ArrowState.Hold) {
                arrow.missedFrames--
                if (arrow.missedFrames <= 0)
                    this.ArrowMissed(arrow)
            }
            else if (arrow.missedFrames < CONFIG.GAME.MAX_MISSED_FRAME_HOLD)
                arrow.missedFrames++

            return
        }

        if (currentBeat > arrow.beatPosition + (CONFIG.JUDGMENT.MISS_WINDOW * tolerance)) {
            arrow.isMissed = true
            this.ArrowMissed(arrow)
            return
        }

        if (padArrowState === ArrowState.Press) {
            if (currentBeat > arrow.beatPosition + tolerance) {
                this.ArrowAlmost(arrow)
                return
            }
            const difference = Math.abs(arrow.beatPosition - currentBeat)

            if (difference <= tolerance * CONFIG.JUDGMENT.PERFECT_WINDOW) {
                // Perfect: Very close to the beat
                this.ArrowPerfect(arrow)
                return
            } else if (difference <= tolerance * CONFIG.JUDGMENT.GREAT_WINDOW) {
                // Great: Slightly off but close enough
                this.ArrowGreat(arrow)
                return
            } else if (difference <= tolerance) {
                // Good: Further off but still acceptable
                this.ArrowGood(arrow)
                return
            }
        }
    }

    ArrowPerfect(arrow: Arrow) {
        arrow.Perfect()
        this.UpdatePerformance(CONFIG.PERFORMANCE.PERFECT)
        this.score += this.scorePerArrow
        this.comboCount++
        this.precisionMessage.push({ direction: arrow.direction, precision: Precision.Perfect })

        this.announcerService.ChangeSatisfaction(SatisfactionType.Perfect, CONFIG.ANNOUNCER.SATISFACTION.PERFECT)
    }

    ArrowGreat(arrow: Arrow) {
        arrow.Great()
        this.UpdatePerformance(CONFIG.PERFORMANCE.GREAT)
        this.score += this.scorePerArrow * CONFIG.SCORE.GREAT_RATIO
        this.comboCount++
        this.precisionMessage.push({ direction: arrow.direction, precision: Precision.Great })

        if (this.comboCount >= CONFIG.ANNOUNCER.GREAT_COMBO)
            this.announcerService.ChangeSatisfaction(SatisfactionType.Perfect, CONFIG.ANNOUNCER.SATISFACTION.GREAT_IN_COMBO)
        else
            this.announcerService.ChangeSatisfaction(SatisfactionType.Good, CONFIG.ANNOUNCER.SATISFACTION.GREAT)
    }

    ArrowGood(arrow: Arrow) {
        arrow.Good()
        this.UpdatePerformance(CONFIG.PERFORMANCE.GOOD)
        this.score += this.scorePerArrow * CONFIG.SCORE.GOOD_RATIO
        this.comboCount++
        this.precisionMessage.push({ direction: arrow.direction, precision: Precision.Good })

        if (this.comboCount >= CONFIG.ANNOUNCER.GOOD_COMBO)
            this.announcerService.ChangeSatisfaction(SatisfactionType.Perfect, CONFIG.ANNOUNCER.SATISFACTION.GOOD_IN_COMBO)
        else
            this.announcerService.ChangeSatisfaction(SatisfactionType.Good, CONFIG.ANNOUNCER.SATISFACTION.GOOD)
    }

    ArrowAlmost(arrow: Arrow) {
        arrow.Almost()
        this.UpdatePerformance(CONFIG.PERFORMANCE.ALMOST)
        this.score += this.scorePerArrow * CONFIG.SCORE.ALMOST_RATIO
        this.comboCount = 0
        this.precisionMessage.push({ direction: arrow.direction, precision: Precision.Almost })

        this.announcerService.ChangeSatisfaction(SatisfactionType.Fail, CONFIG.ANNOUNCER.SATISFACTION.ALMOST)
    }

    ArrowMissed(arrow: Arrow) {
        arrow.Missed()
        this.UpdatePerformance(CONFIG.PERFORMANCE.MISS)
        this.comboCount = 0
        this.precisionMessage.push({ direction: arrow.direction, precision: Precision.Missed })

        this.announcerService.ChangeSatisfaction(SatisfactionType.Fail, CONFIG.ANNOUNCER.SATISFACTION.MISS)
    }

    ArrowOk(arrow: Arrow) {
        arrow.Ok()
        const arrowLength = arrow.holdLength
        this.performance = Math.min(CONFIG.PERFORMANCE.MAX, this.performance + arrowLength)
        this.score += arrowLength * this.scorePerHoldBeat
        this.precisionMessage.push({ direction: arrow.direction, precision: Precision.Ok })

        if (this.comboCount >= CONFIG.ANNOUNCER.HOLD_COMBO)
            this.announcerService.ChangeSatisfaction(SatisfactionType.Perfect, CONFIG.ANNOUNCER.SATISFACTION.HOLD_IN_COMBO)
        else
            this.announcerService.ChangeSatisfaction(SatisfactionType.Good, CONFIG.ANNOUNCER.SATISFACTION.HOLD)
    }

    MineHit(arrow: Arrow) {
        arrow.Boom()
        this.UpdatePerformance(CONFIG.PERFORMANCE.MINE_HIT)
        this.comboCount = 0

        this.mineHitSound.currentTime = 0
        SoundService.PlaySound(this.mineHitSound)

        this.announcerService.ChangeSatisfaction(SatisfactionType.Fail, CONFIG.ANNOUNCER.SATISFACTION.MINE_HIT)
    }

    MinePassed(arrow: Arrow) {
        arrow.Ok()
    }

    UpdatePerformance(amount: number): void {
        if (this.isTrainingMode || this.isFailed)
            return

        this.performance += amount

        if (this.performance > CONFIG.PERFORMANCE.MAX)
            this.performance = CONFIG.PERFORMANCE.MAX
        else if (this.performance < 0)
            this.performance = 0

    }

    EndFail() {
        this.isFailed = true
        this.performance = 1
    }

    EndVictory() {
        if (this.isFailed) return
        this.isFinished = true
    }

    //#region Statics
    // Judgments given by a press, as opposed to Missed (time out) and Boom (mine)
    private static IsPressJudgment(precision: Precision | null): boolean {
        return precision === Precision.Perfect || precision === Precision.Great || precision === Precision.Good || precision === Precision.Almost
    }
    //#endregion
}
