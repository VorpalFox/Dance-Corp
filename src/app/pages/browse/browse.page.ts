import { NgClass, NgStyle, } from '@angular/common'
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChildren, inject, signal } from '@angular/core'
import { InfiniteScrollCustomEvent, IonBadge, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonInfiniteScroll, IonInfiniteScrollContent, IonMenu, IonSearchbar, IonSplitPane, IonText, SearchbarCustomEvent } from '@ionic/angular'
import { MusicDto, NoteDataDto } from 'src/app/game/game-model/music.dto'
import { IMusicPlayer, MusicOrigin, MusicPlayerCommon } from 'src/app/game/music-player/IMusicPlayer'
import { UserMusicDto, UserNoteDto } from '../user-profile/user.dto'

import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { ArrowDirection } from 'src/app/game/constants/arrow-direction.enum'
import { Color } from 'src/app/game/constants/color'
import { DanceType } from 'src/app/game/constants/dance-type.enum'
import { CONFIG } from 'src/app/game/constants/game-config'
import { NoteDifficulty } from 'src/app/game/constants/note-difficulty.enum'
import { CreateDancePad } from 'src/app/game/game-controller/dancepad.factory'
import { IDancePad } from 'src/app/game/game-controller/dancepad.interface'
import { MusicPlayerLocalComponent } from "src/app/game/music-player/music-player-local/music-player-local.component"
import { MusicPlayerSoundcloudComponent } from "src/app/game/music-player/music-player-soundcloud/music-player-soundcloud.component"
import { MusicPlayerYoutubeComponent } from "src/app/game/music-player/music-player-youtube/music-player-youtube.component"
import { AnnouncerService } from 'src/app/services/gameplay/announcer.service'
import { MusicLocalService } from 'src/app/services/local-storage/local.music.service'
import { UserCacheService } from 'src/app/services/local-storage/user.cache.service'
import { GamepadService, GamepadStatus } from 'src/app/services/gameplay/gamepad.service'
import { UserConfigService } from 'src/app/services/userconfig.service'
import { AppComponent } from 'src/app/app.component'
import { HeaderComponent } from "src/app/shared/component/header/header.component"
import { RadarScoreComponent } from "src/app/shared/component/radar-score/radar-score.component"
import { MusicCacheService } from '../../services/local-storage/music.cache.service'
import { PresenceService } from '../../services/thirdpartyapp/presence.service'
import { productionConsole } from 'src/app/shared/console-output'
import { GradeComponent } from "../../shared/component/grade/grade.component"
import { DifficultyCriteria } from '../upload/DifficultyCriteria'
import { UserFirestoreService } from './../../services/firestore/user.firestore.service'
import { SoundService } from './../../services/gameplay/sound.service'

@Component({
  selector: 'app-browse',
  templateUrl: './browse.page.html',
  styleUrls: ['./browse.page.scss'],
  standalone: true,
  imports: [IonBadge, IonSplitPane, IonCardSubtitle, IonMenu, IonText, IonCardContent, IonCardTitle, IonInfiniteScrollContent, IonInfiniteScroll, IonSearchbar, IonCard, IonCardHeader, IonContent, NgStyle, NgClass, FormsModule, HeaderComponent, GradeComponent, RadarScoreComponent, MusicPlayerYoutubeComponent, MusicPlayerLocalComponent, MusicPlayerSoundcloudComponent]
})
export class BrowsePage implements OnInit, OnDestroy {
  //#region Constants
  readonly SOUND_ARROW_UP = new Audio('assets/Sounds/menuFx/arrow_up.ogg')
  readonly SOUND_ARROW_DOWN = new Audio('assets/Sounds/menuFx/arrow_down.ogg')

  readonly MusicOrigin = MusicOrigin
  readonly DanceType = DanceType
  pickMusicPlayer = MusicPlayerCommon.PickMusicPlayer
  //#endregion

  private router = inject(Router)
  private cd = inject(ChangeDetectorRef)
  private localMusicService = inject(MusicLocalService)
  private musicCacheService = inject(MusicCacheService)
  private userFirestoreService = inject(UserFirestoreService)
  private userConfigService = inject(UserConfigService)
  private gamepadService = inject(GamepadService)
  private userCacheService = inject(UserCacheService)
  private announcerService = inject(AnnouncerService)
  private discordRpcService = inject(PresenceService)
  private soundService = inject(SoundService)

  dbMusics = signal<MusicDto[]>([])
  storedMusics = signal<MusicDto[]>([])

  musicNotes = signal<NoteDataDto[]>([])
  musicUserScore = signal<UserMusicDto | null>(null)

  userScores: Record<string, number> = {}

  searchQuery: string = ''

  selectedMusicIndex = signal<number>(0)
  selectedNotesIndex = signal<number[]>([])

  dancepad: IDancePad[] = []

  lastDifficultyPlayed: NoteDifficulty[] = []

  private sampleLoopActive = false

  @ViewChildren('musicCard', { read: ElementRef }) musicCards!: QueryList<ElementRef>

  ngOnInit() {
    this.searchQuery = localStorage.getItem('browseSearchQuery') ?? ''
    this.selectedNotesIndex.set(new Array(this.userConfigService.players.length).fill(0))

    this.InitIonInfinite()

    this.InitPlayerInput()
    void this.discordRpcService.Update("Browsing")
  }

  //#region Input handling
  ionViewWillEnter() {
    window.addEventListener('keydown', this.KeyHandler)
    this.isListeningInput = true
    this.ListenInput()
  }

  ionViewWillLeave() {
    window.removeEventListener('keydown', this.KeyHandler)
    this.isListeningInput = false
    this.sampleLoopActive = false
  }

  ngOnDestroy() {
    this.dancepad.forEach(pad => pad.Destroy())
  }

  InitPlayerInput() {
    const players = this.userConfigService.players
    players.forEach((player, index) => {
      this.dancepad.push(CreateDancePad(player))
      if (player.gamepadId === undefined) return
      const name = player.name ?? `Player ${index + 1}`
      const gamepadName = GamepadService.GetDisplayName(player.gamepadId)
      const status = this.gamepadService.GetStatus(player.gamepadId)
      if (status === GamepadStatus.Plugged || status === GamepadStatus.Unknown)
        AppComponent.PresentOkToast(`${name}: press a button of ${gamepadName} to activate it`)
      else if (status === GamepadStatus.Unplugged)
        AppComponent.PresentWarningToast(`${name}: ${gamepadName} is not plugged in`)
    })
  }

  readonly blockedKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar', 'Enter']
  private KeyHandler = (event: KeyboardEvent) => {
    if (this.isFocusOnSearchInput) return
    if (this.blockedKeys.includes(event.key)) {
      event.preventDefault()
    }
    if (event.key === 'Enter') {
      void this.RunGame()
    }
  }

  isFocusOnSearchInput = false
  isListeningInput = false
  ListenInput() {
    if (!this.isFocusOnSearchInput) {
      for (let index = 0; index < this.dancepad.length; index++) {
        const padstate = this.dancepad[index].GetRefreshedState()
        if (padstate[ArrowDirection.Left]) {
          this.OnSelectMusic(Math.max(0, this.selectedMusicIndex() - 1))
        }
        if (padstate[ArrowDirection.Right]) {
          this.OnSelectMusic(Math.min(this.storedMusics().length + this.dbMusics().length - 1, this.selectedMusicIndex() + 1))
        }
        if (padstate[ArrowDirection.Down]) {
          const notesLength = this.musicNotes().length
          this.OnSelectNote(Math.min(notesLength - 1, (this.selectedNotesIndex()[index] ?? 0) + 1), index)
        }
        if (padstate[ArrowDirection.Up]) {
          this.OnSelectNote(Math.max(0, (this.selectedNotesIndex()[index] ?? 0) - 1), index)
        }
      }
    }
    if (this.isListeningInput)
      setTimeout(() => this.ListenInput(), 100)
  }
  //#endregion

  GetSelectedMusic(index: number): MusicDto | null {
    if (index >= 0) {
      if (index < this.storedMusics().length)
        return this.storedMusics()[index]
      else
        return this.dbMusics()[index - this.storedMusics().length]
    }
    return null
  }

  OnSelectMusic(listIndex: number) {
    const music = this.GetSelectedMusic(listIndex)
    if (!music) {
      this.musicNotes.set([])
      return
    }

    const isSinglePlayer = this.userConfigService.players.length === 1
    const filteredNotes = music.noteData.filter(note => !isSinglePlayer || note.stepsType === DanceType.DanceSingle).sort((a, b) => a.meter - b.meter)

    this.musicNotes.set(filteredNotes)
    // Each player keeps the same chart position if the new music has it, otherwise its last chart
    const lastNoteIndex = Math.max(0, filteredNotes.length - 1)
    this.selectedNotesIndex.set(this.selectedNotesIndex().map(noteIndex => Math.min(noteIndex, lastNoteIndex)))

    this.selectedMusicIndex.set(listIndex)
    localStorage.setItem('lastMusicSelectedId', music.id)

    this.musicUserScore.set(this.userCacheService.GetMusicStats(music.id))

    this.soundService.PlaySfx(this.SOUND_ARROW_UP)

    setTimeout(() => {
      const el = this.musicCards.toArray()[listIndex]?.nativeElement
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
  }

  OnSelectNote(noteIdx: number, playerIndex: number = 0) {
    this.selectedNotesIndex()[playerIndex] = noteIdx
    this.soundService.PlaySfx(this.SOUND_ARROW_DOWN)
    this.cd.markForCheck()
  }

  OnSearch(event: SearchbarCustomEvent) {
    this.searchQuery = (event.target.value || '').toLowerCase()
    localStorage.setItem('browseSearchQuery', this.searchQuery)

    this.InitIonInfinite()
  }

  InitIonInfinite() {
    const q = this.searchQuery.toLowerCase()

    let updateDbMusics = this.musicCacheService.allRemoteMusics
    let updateLocalMusics = this.localMusicService.allLocalMusics

    if (q) {
      updateLocalMusics =
        this.localMusicService.allLocalMusics.filter(m =>
          m.title?.toLowerCase().includes(q) ||
          m.artist?.toLowerCase().includes(q)
        )
      updateDbMusics =
        this.musicCacheService.allRemoteMusics.filter(m =>
          m.title?.toLowerCase().includes(q) ||
          m.artist?.toLowerCase().includes(q)
        )
    }

    this.storedMusics.set(updateLocalMusics)
    this.dbMusics.set(updateDbMusics)

    const lastId = localStorage.getItem('lastMusicSelectedId')
    const localIndex = lastId ? updateLocalMusics.findIndex(m => m.id === lastId) : -1
    const remoteIndex = lastId ? updateDbMusics.findIndex(m => m.id === lastId) : -1

    const newIndex = localIndex !== -1 ? localIndex : (remoteIndex !== -1 ? remoteIndex + updateLocalMusics.length : 0)
    this.OnSelectMusic(newIndex)
  }

  OnIonInfinite(event: InfiniteScrollCustomEvent) {
    productionConsole.info("Congratz, you found the infinite scroll ! But there is no more music to load :)")
    void event.target.complete()
  }

  OnPlayerReady(mPlayer: IMusicPlayer) {
    const music = this.GetSelectedMusic(this.selectedMusicIndex())
    if (!music) return

    const start = music.sampleStart ?? 0
    const length = music.sampleLength ?? 5

    this.sampleLoopActive = true
    void this.StartSampleLoop(mPlayer, start, length)
  }

  private async StartSampleLoop(player: IMusicPlayer, start: number, length: number, delay: number = 2) {
    function Sleep(ms: number) {
      return new Promise(res => setTimeout(res, ms))
    }
    while (this.sampleLoopActive) {
      player.SetToTime(start)
      player.Play()

      const endTime = start + length

      // sampleLoopActive changes during the await, which the type checker does not see
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (this.sampleLoopActive && player.GetCurrentTime() < endTime) {
        await Sleep(100)
      }
      player.Stop()

      let waited = 0
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (this.sampleLoopActive && waited < delay * 1000) {
        await Sleep(100)
        waited += 100
      }
    }
  }

  async RunGame(): Promise<void> {
    const selectedMusic = this.GetSelectedMusic(this.selectedMusicIndex())
    if (!selectedMusic) return
    // Charts are sent by name: selectedNotesIndex indexes the filtered and sorted musicNotes, not music.noteData
    const chartNames = this.selectedNotesIndex().map(index => this.musicNotes()[index]?.chartName)
    if (chartNames.some(name => !name)) return
    await this.musicCacheService.UpdateCacheMusic(selectedMusic.id)

    for (let i = 0; i < this.selectedNotesIndex().length; i++) {
      const newDifficulty = this.musicNotes().at(this.selectedNotesIndex()[i])?.difficulty
      const lastDifficulty = this.lastDifficultyPlayed[i]
      if (newDifficulty && newDifficulty !== lastDifficulty) {
        this.lastDifficultyPlayed[i] = newDifficulty
        this.announcerService.PlayAnnouncerLine("difficulty", newDifficulty.toLowerCase())
      }
    }

    void this.router.navigate(['/play/game', selectedMusic.id], {
      queryParams: {
        notes: chartNames,
      }
    })
  }

  //#region Utils

  GetSelectedNotesDifficulty(): DifficultyCriteria[] {
    const notes = this.musicNotes().filter((note, index) => this.selectedNotesIndex().includes(index))
    return notes.map(note => note.difficultyCriterias).filter((d): d is DifficultyCriteria => d !== undefined)
  }

  GetPlayersForNote(noteIndex: number): number[] {
    return this.selectedNotesIndex()
      .map((selectedIdx, player) => selectedIdx === noteIndex ? player : null)
      .filter((v): v is number => v !== null)
  }

  GetPlayerColor(playerIndex: number): string {
    return CONFIG.PLAYER_COLORS[playerIndex % CONFIG.PLAYER_COLORS.length].stroke
  }

  GetNoteColor(difficulty: NoteDifficulty): string {
    return Color.NoteDifficultyColor(difficulty)
  }

  GetUserNote(chartname: string): UserNoteDto | null {
    return this.musicUserScore()?.notes.find(n => n.id === chartname) ?? null
  }
  //#endregion
}
