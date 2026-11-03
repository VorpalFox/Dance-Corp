import { Injectable, effect, inject } from '@angular/core'

import { ArrowImageManager } from '../game/game-display/arrowImageManager'
import { BehaviorSubject } from 'rxjs'
import { Player } from '../game/game-model/player'
import { UserFirestoreService } from './firestore/user.firestore.service'

@Injectable({
    providedIn: 'root',
})
export class UserConfigService {
    //#region Constants
    private readonly CONFIG_STORAGE_KEY = "userConfig"
    private readonly PLAYERS_STORAGE_KEY = (index: number) => `playersConfig${index}`
    //#endregion

    private userFirestoreService = inject(UserFirestoreService)

    private configSubject: BehaviorSubject<UserConfig> = new BehaviorSubject<UserConfig>(new UserConfig())
    config$ = this.configSubject.asObservable()

    players: Player[] = []

    constructor() {
        const storedConfig: UserConfig = JSON.parse(localStorage.getItem(this.CONFIG_STORAGE_KEY) || '{}')
        const defaultConfig = new UserConfig()

        this.configSubject = new BehaviorSubject<UserConfig>({ ...defaultConfig, ...storedConfig })

        for (let i = 0; i < this.configSubject.value.playerNumber; i++) {
            this.players.push(this.InstanciatePlayer(i))
        }

        // Set logged user to player 0
        effect(() => {
            const user = this.userFirestoreService.userData()

            if (user) {
                this.players[0].userId = user.id
                this.players[0].name = user.name
            } else {
                this.players[0].userId = null
                this.players[0].name = "Player 0"
            }
        })

        ArrowImageManager.SetArrowSize(this.configSubject.value.canvasWidth / 4)
    }

    InstanciatePlayer(index: number): Player {
        const storedPlayer = localStorage.getItem(this.PLAYERS_STORAGE_KEY(index))
        return storedPlayer ? Player.FromJSON(JSON.parse(storedPlayer)) : new Player()
    }

    GetConfig(): UserConfig {
        return this.configSubject.value
    }

    UpdatePlayerCount(count: number) {
        const currentCount = this.configSubject.value.playerNumber
        if (count > currentCount) {
            for (let i = currentCount + 1; i <= count; i++) {
                this.players.push(this.InstanciatePlayer(i))
            }

        } else if (count < currentCount) {
            this.players.splice(count)
        }

        this.UpdateConfig("playerNumber", count)
    }

    AddPlayer() {
        this.players.push(this.InstanciatePlayer(this.players.length))
        this.UpdateConfig("playerNumber", this.players.length)
    }

    RemovePlayerAt(position: number) {
        if (position > 0) {
            const playerToMove = this.players.splice(position, 1)[0]

            this.players.forEach((player, index) => {
                localStorage.setItem(this.PLAYERS_STORAGE_KEY(index), JSON.stringify(player))
            })
            localStorage.setItem(this.PLAYERS_STORAGE_KEY(this.players.length), JSON.stringify(playerToMove))
        }
        this.UpdateConfig("playerNumber", this.players.length)
    }

    // A gamepad not seen yet does not block: it plays from its first button press
    ArePlayersReady(): boolean {
        return this.players.every(player => player.gamepadId !== undefined)
    }

    UpdateConfig<K extends keyof UserConfig>(option: K, value: UserConfig[K]): void {
        if (!(option in this.configSubject.value)) {
            console.error(`Invalid option  : ${option}`)
            return
        }

        const updatedConfig = { ...this.configSubject.value, [option]: value }
        this.configSubject.next(updatedConfig)

        localStorage.setItem(this.CONFIG_STORAGE_KEY, JSON.stringify(this.configSubject.value))
    }

    UpdatePlayer<K extends keyof Player>(option: K, playerIndex: number, value: Player[K]): void {
        if (playerIndex < 0 || playerIndex >= this.players.length) {
            console.error(`Invalid player index: ${playerIndex}`)
            return
        }

        const player: Player = this.players[playerIndex]
        player[option] = value

        localStorage.setItem(this.PLAYERS_STORAGE_KEY(playerIndex), JSON.stringify(player))
    }

    ResetToDefault(): void {
        localStorage.removeItem(this.CONFIG_STORAGE_KEY)
        for (let index = 0; index < 4; index++) {
            localStorage.removeItem(this.PLAYERS_STORAGE_KEY(index))
        }
    }
}

export class UserConfig {
    // General

    // Gameplay
    playerNumber = 1
    trainingMode = false

    // Display
    showBars = true
    canvasWidth = 500
    canvasHeight = 1200
    canvasArrowSize = 120
    showPlayerDisplay = false

    // Sound
    announcersVolume = 1
    musicVolume = 1
    menuMusicVolume = 0.1
    sfxVolume = 0.5
}