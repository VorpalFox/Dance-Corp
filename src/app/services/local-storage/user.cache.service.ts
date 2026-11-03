import { Injectable, effect, inject } from "@angular/core"
import { UserDto, UserMusicDto, UserNoteDto } from 'src/app/pages/user-profile/user.dto'

import { AppComponent } from "src/app/app.component"
import { GameRound } from "src/app/game/game-model/gameRound"
import { UserFirestoreService } from 'src/app/services/firestore/user.firestore.service'

@Injectable({ providedIn: 'root' })
export class UserCacheService {
    //#region Constants
    private readonly USER_KEY = "LAST_LOGGED_IN_USER"
    private readonly USERMUSIC_REGISTRY_KEY = 'REGISTRY_USER_MUSIC'
    private readonly USERMUSIC_STORAGE_KEY = (musicId: string) => `USER_MUSIC_${musicId}`
    //#endregion

    private userFirestoreService = inject(UserFirestoreService)

    private registry: Set<string> = new Set()
    private userMusics: UserMusicDto[] = []

    private isSessionOnly = false

    constructor() {
        effect(() => {
            const user = this.userFirestoreService.user
            this.OnUserDataChange(user)
        })

    }

    OnUserDataChange(user: UserDto | null) {
        if (user) {
            console.log(`User logged in: ${user.name} (${user.id}). Checking cache...`)
            const lastUser = localStorage.getItem(this.USER_KEY)
            this.isSessionOnly = false

            if (lastUser === user.id) {
                this.InitCacheFromStorage()
            } else {
                this.ClearCache()
                localStorage.setItem(this.USER_KEY, user.id)
                this.InitCacheFromFirestore(user.id)
                    .catch(error => AppComponent.PresentWarningToast("Failed to load your scores: " + error))
            }
        } else {
            console.log("User logged out, clearing cache.")
            this.registry.clear()
            this.userMusics = []
            this.isSessionOnly = true
        }
    }

    InitCacheFromStorage() {
        this.registry = new Set(JSON.parse(localStorage.getItem(this.USERMUSIC_REGISTRY_KEY) || '[]'))
        this.userMusics = []
        for (const musicId of this.registry) {
            const raw = localStorage.getItem(this.USERMUSIC_STORAGE_KEY(musicId))
            if (raw) {
                this.userMusics.push(JSON.parse(raw))
            }
        }
        console.log(`Loaded ${this.userMusics.length} musics from localStorage.`)
    }

    private async InitCacheFromFirestore(userId: string) {
        console.log("Loading user music registry from Firestore...")

        const musics = await this.userFirestoreService.GetAllUserMusics(userId)

        this.registry.clear()
        this.userMusics = []

        for (const music of musics) {
            this.registry.add(music.id)
            this.userMusics.push(music)
            localStorage.setItem(this.USERMUSIC_STORAGE_KEY(music.id), JSON.stringify(music))
        }

        localStorage.setItem(this.USERMUSIC_REGISTRY_KEY, JSON.stringify(Array.from(this.registry)))

        console.log(`Loaded ${musics.length} musics from Firestore.`)
    }

    ClearCache() {
        localStorage.removeItem(this.USER_KEY)
        localStorage.removeItem(this.USERMUSIC_REGISTRY_KEY)
        for (const musicId of this.registry) {
            localStorage.removeItem(this.USERMUSIC_STORAGE_KEY(musicId))
        }
        this.registry.clear()
        this.userMusics = []
    }

    public GetMusicStats(musicId: string): UserMusicDto {
        if (this.registry.has(musicId) === false)
            return new UserMusicDto(musicId)

        return this.userMusics.find(music => music.id === musicId) || new UserMusicDto(musicId)
    }

    public UpdateUserStatsFromRound(musicId: string, noteId: string, gameRound: GameRound) {
        // 1. Ensure registry entry exists
        let music = this.userMusics.find(m => m.id === musicId)
        if (!music) {
            music = new UserMusicDto(musicId)
            this.userMusics.push(music)
            this.registry.add(musicId)
            if (!this.isSessionOnly) {
                localStorage.setItem(this.USERMUSIC_REGISTRY_KEY, JSON.stringify(Array.from(this.registry)))
            }
        }

        // 3. Ensure note exists
        let note = music.notes.find(n => n.id === noteId)
        if (!note) {
            note = new UserNoteDto(noteId)
            music.notes.push(note)
        }

        // 4. Update music stats
        music.timesPlayed += 1

        note.passed = note.passed || gameRound.isFinished
        note.timesPlayed += 1
        note.highScore = Math.max(note.highScore, Math.round(gameRound.score))
        note.highScoreGamepad = gameRound.player.gamepadId ?? "Unknown gamepad"

        // 5. Stop here if session-only
        if (this.isSessionOnly) return

        // 6. Update LocalStorage
        localStorage.setItem(this.USERMUSIC_STORAGE_KEY(musicId), JSON.stringify(music))

        // 7. Update Firestore
        this.userFirestoreService.UpdateUserStatsFromRound(music, gameRound)
            .catch(error => AppComponent.PresentErrorToast("Failed to save your score: " + error))
    }

}