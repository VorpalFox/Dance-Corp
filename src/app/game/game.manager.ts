import { UserCacheService } from 'src/app/services/local-storage/user.cache.service'
import { UserNoteDto } from '../pages/user-profile/user.dto'
import { AnnouncerService } from '../services/gameplay/announcer.service'
import { CONFIG } from "./constants/game-config"
import { PlayerDisplayComponent } from "./game-display/player-display.component"
import { GameRound } from './game-model/gameRound'
import { MusicDto, NoteDataDto } from './game-model/music.dto'
import { Player } from './game-model/player'
import { BeatManager } from './game-model/timeline/beatManager'
import { IMusicPlayer } from "./music-player/IMusicPlayer"

export class GameManager {

    music: MusicDto
    isTrainingMode: boolean = false
    mainUserStats: UserNoteDto | null = null
    private notes: NoteDataDto[]

    constructor(music: MusicDto, players: Player[], notes: NoteDataDto[], isTrainingMode: boolean, private userCacheService: UserCacheService, private announcerService: AnnouncerService) {
        this.music = music
        this.isTrainingMode = isTrainingMode
        this.notes = notes

        for (let index = 0; index < players.length; index++) {
            const player = players[index]
            this.gameRounds.push(new GameRound(notes[index], player, this.isTrainingMode, announcerService))
        }

        this.beatManager = new BeatManager(this.music)
        this.mainUserStats = this.userCacheService.GetMusicStats(this.music.id).notes.find((n: UserNoteDto) => n.id === notes[0].chartName) ?? null
    }

    public gameRounds: GameRound[] = []
    musicPlayer!: IMusicPlayer
    playerDisplays: PlayerDisplayComponent[] = []

    private beatManager: BeatManager

    private currentBackgroundIndex = 0
    private zeroTimeStamp: number = 0

    public RegisterExternalComponents(musicPlayer: IMusicPlayer) {
        this.musicPlayer = musicPlayer
    }

    public async StartGame() {
        console.log("Waiting for audio to start…")

        this.musicPlayer.Play()
        const hasStarted = await this.WaitForMusicStart()
        if (!hasStarted) return

        const musicCurrentTime = this.musicPlayer.GetCurrentTime()
        this.zeroTimeStamp = Math.round(performance.now()) - (musicCurrentTime * 1000)

        this.GameGlobalLoop(this.zeroTimeStamp)

        console.log("Game has started")
    }

    /** Resolves true once the music time moves, false if the game is destroyed first. Rejects after MUSIC_START_TIMEOUT */
    private WaitForMusicStart(): Promise<boolean> {
        const deadline = performance.now() + CONFIG.GAME.MUSIC_START_TIMEOUT * 1000
        return new Promise<boolean>((resolve, reject) => {
            const Check = () => {
                if (this.isDestroyed) return resolve(false)
                if (this.musicPlayer.GetCurrentTime() > 0) return resolve(true)
                if (performance.now() > deadline) return reject(new Error(`The music did not start after ${CONFIG.GAME.MUSIC_START_TIMEOUT} seconds`))
                requestAnimationFrame(Check)
            }
            Check()
        })
    }

    private gameLoopId: number | null = null
    private GameGlobalLoop(currentTimestamp: DOMHighResTimeStamp): void {
        const roundedTimestamp = Math.round(currentTimestamp)
        const elapsedTime = (roundedTimestamp - this.zeroTimeStamp) / 1000 // In seconds

        const { beat: currentBeat, bps: currentBps } = this.beatManager.GetBeatAndBpsAtTime(elapsedTime)

        if (this.currentBackgroundIndex + 1 < this.music.bgChanges.length && currentBeat >= this.music.bgChanges[this.currentBackgroundIndex + 1].time) {
            this.currentBackgroundIndex++
        }

        for (const gameRound of this.gameRounds) {
            gameRound.GameLoop(currentBeat, CONFIG.GAME.TOLERANCE_WINDOW * currentBps)
        }

        if (this.gameRounds.every(gameRound => gameRound.isFailed || gameRound.isFinished)) {
            this.GameOver()
            return // Stop loop
        }

        // sync with musicPlayer
        //const musicCurrentTime = this.musicPlayer.getCurrentTime();

        // Schedule the next loop iteration
        this.gameLoopId = requestAnimationFrame(this.GameGlobalLoop.bind(this))
    }

    public GetCurrentBackground(): string {
        if (this.music.bgChanges.length === 0) {
            return CONFIG.GAME.DEFAULT_BACKGROUND
        }
        return "https://" + this.music.bgChanges[this.currentBackgroundIndex].value
    }

    //#region Game Over
    private _isGameOver: boolean = false
    public get isGameOver(): boolean {
        return this._isGameOver
    }

    private set isGameOver(value: boolean) {
        this._isGameOver = value
    }

    GameOver() {
        console.log('Game Over: All game rounds have failed or finished.')
        this.isGameOver = true

        // At least one player finished with the max score
        if (this.gameRounds.some(gr => gr.isFinished && Math.round(gr.score) >= CONFIG.SCORE.MAX)) {
            this.announcerService.PlayAnnouncer("victory")
            this.announcerService.PlayCrowdOneShot("special")
        }
        // At least one player finished and has a score of A
        else if (this.gameRounds.some(gr => gr.isFinished && Math.round(gr.score) >= CONFIG.SCORE.MAX * CONFIG.SCORE.APPLAUSE_HEAVY_RATIO)) {
            this.announcerService.PlayAnnouncer("victory")
            this.announcerService.PlayCrowdOneShot("applause_heavy")
        }
        // At least one player finished
        else if (this.gameRounds.some(gr => gr.isFinished)) {
            this.announcerService.PlayAnnouncer("victory_small")
            this.announcerService.PlayCrowdOneShot("applause_light")
        }
        // All players failed
        else {
            this.announcerService.PlayAnnouncer("game_over")
            this.announcerService.PlayCrowdOneShot("boo")
        }
        // Main Player get new highscore
        if (this.gameRounds[0].isFinished && this.mainUserStats && Math.round(this.gameRounds[0].score) > this.mainUserStats.highScore) {
            this.announcerService.PlayAnnouncer("high_score")
        }

        if (!this.isTrainingMode) {
            this.gameRounds.forEach((gameRound, index) => {
                this.userCacheService.UpdateUserStatsFromRound(this.music.id, this.notes[index].chartName, gameRound)
            })
        }

    }

    private isDestroyed = false
    public DestroyGame() {
        this.isDestroyed = true
        if (this.gameLoopId !== null) {
            cancelAnimationFrame(this.gameLoopId)
        }
        this.gameRounds.forEach(gameRound => gameRound.dancepad.Destroy())
        this.gameRounds = []
    }
    //#endregion
}
