import { Component, inject } from '@angular/core'
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonIcon, IonInput, IonItem, IonSelect, IonSelectOption } from '@ionic/angular'

import { AnnouncerService } from 'src/app/services/gameplay/announcer.service'

import { FormsModule } from '@angular/forms'
import { GamepadService, GamepadStatus } from 'src/app/services/gameplay/gamepad.service'
import { HeaderComponent } from "src/app/shared/component/header/header.component"
import { Player } from 'src/app/game/game-model/player'
import { RouterModule } from '@angular/router'
import { UserConfigService } from 'src/app/services/userconfig.service'
import { UserFirestoreService } from 'src/app/services/firestore/user.firestore.service'
import { addCircle } from 'ionicons/icons'
import { addIcons } from 'ionicons'

@Component({
  selector: 'app-player-selection',
  templateUrl: './player-selection.page.html',
  styleUrls: ['./player-selection.page.scss'],
  standalone: true,
  imports: [IonInput, IonIcon, IonCardSubtitle, IonCardHeader, IonButton, IonCardContent, IonItem, IonCard, IonCardTitle, IonContent, IonSelectOption, RouterModule, IonSelect, FormsModule, HeaderComponent]
})
export class PlayerSelectionPage {
  userConfigService = inject(UserConfigService)
  gamepadService = inject(GamepadService)
  private announcerService = inject(AnnouncerService)
  private userFirestoreService = inject(UserFirestoreService)

  // Player 0 is the logged user: read from the signal, the player is updated outside of the page change detection
  readonly loggedUser = this.userFirestoreService.userData

  userList: { id: string | null, name: string }[] = []

  constructor() {
    addIcons({ addCircle })
  }

  //TODO handle multiple connections

  GetPlayers(): Player[] {
    return this.userConfigService.players
  }

  AddPlayer(): void {
    this.userConfigService.AddPlayer()
  }

  RemovePlayer(index: number): void {
    this.userConfigService.RemovePlayerAt(index)
  }

  UpdateGamepad(playerIndex: number, gamepadId: string): void {
    this.userConfigService.UpdatePlayer('gamepadId', playerIndex, gamepadId)
  }

  UpdateUser(playerIndex: number, userId: string | null) {
    this.userConfigService.UpdatePlayer('userId', playerIndex, userId)
  }

  get allPlayersReady(): boolean {
    return this.userConfigService.ArePlayersReady()
  }

  GetPlayerStatus(): string {
    const players = this.userConfigService.players
    const names = players.map((player, index) => player.name ?? `Player ${index + 1}`)
    const statuses = players.map(player => player.gamepadId === undefined ? null : this.gamepadService.GetStatus(player.gamepadId))
    const missingGamepad = names.filter((_, index) => statuses[index] === null)
    // Not blocking: the gamepad plays as soon as the webview sees it
    const unseenGamepad = names.filter((_, index) => statuses[index] === GamepadStatus.Plugged || statuses[index] === GamepadStatus.Unknown)
    const unpluggedGamepad = names.filter((_, index) => statuses[index] === GamepadStatus.Unplugged)

    let statusMessage = this.allPlayersReady ? "✅ All players are ready!\n" : ""

    if (missingGamepad.length > 0) {
      statusMessage += `⚠ ${missingGamepad.join(", ")} must have a gamepad.\n`
    }

    if (unseenGamepad.length > 0) {
      statusMessage += `🔄 ${unseenGamepad.join(", ")}: press a button to activate your gamepad.\n`
    }

    if (unpluggedGamepad.length > 0) {
      statusMessage += `🔌 ${unpluggedGamepad.join(", ")}: your gamepad is not plugged in.\n`
    }

    return statusMessage
  }

  OnStartClick() {
    this.announcerService.PlayAnnouncer("ready")
  }

}
