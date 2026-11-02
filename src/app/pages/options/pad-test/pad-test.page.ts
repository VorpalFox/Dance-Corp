import { AlertController, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonItem, IonLabel, IonSelect, IonSelectOption } from '@ionic/angular'

import { AppComponent } from 'src/app/app.component'
import { ArrowDirection } from 'src/app/game/constants/arrow-direction.enum'
import { DancePadGamepad } from 'src/app/game/game-controller/dancepad-gamepad'

import { ChangeDetectorRef, Component, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { GamepadService } from 'src/app/services/gameplay/gamepad.service'
import { HeaderComponent } from "src/app/shared/component/header/header.component"
import { Player } from 'src/app/game/game-model/player'
import { UserConfigService } from 'src/app/services/userconfig.service'

@Component({
  selector: 'app-pad-test',
  templateUrl: './pad-test.page.html',
  styleUrls: ['./pad-test.page.scss'],
  standalone: true,
  imports: [IonCardSubtitle, IonItem, IonLabel, IonButton, IonCardContent, IonCardTitle, IonCard, IonCardHeader, IonSelect, IonSelectOption, IonContent, FormsModule, HeaderComponent]
})
export class PadTestPage {
  gamepadService = inject(GamepadService)
  userConfigService = inject(UserConfigService)
  private alertController = inject(AlertController)
  private cd = inject(ChangeDetectorRef)

  readonly ArrowDirection = ArrowDirection
  readonly KEYBOARD_ID = Player.KEYBOARD_ID
  readonly GetDisplayName = GamepadService.GetDisplayName
  readonly arrowKeys = Object.values(ArrowDirection).filter(value => typeof value === 'number')
  playerIndexSelected: number | undefined
  playerSelected: Player | undefined
  gampadBindings: Map<ArrowDirection, number> = new Map<ArrowDirection, number>()
  gamepadStartBinding: number | null = null
  keyboardBindings: Map<ArrowDirection, string> = new Map<ArrowDirection, string>()
  keyboardStartBinding: string | null = null

  waitingForInput: boolean = false

  SelectPlayer(player: Player, playerIndex: number) {
    this.playerIndexSelected = playerIndex
    this.playerSelected = player
    this.gampadBindings.clear()
    this.keyboardBindings.clear()
    // Inverse keyboard bindings (from key to ArrowDirection)
    for (const [key, direction] of player.keyBindingKeyboard.entries()) {
      this.keyboardBindings.set(direction, key) // Map ArrowDirection -> key
    }

    // Inverse gamepad bindings (from button index to ArrowDirection)
    for (const [button, direction] of player.keyBindingGamepad.entries()) {
      this.gampadBindings.set(direction, button) // Map ArrowDirection -> button index
    }
  }

  UpdateGamepad(playerIndex: number, gamepadId: string): void {
    this.userConfigService.UpdatePlayer('gamepadId', playerIndex, gamepadId)
  }

  async OpenBindPopover(arrowDirection: ArrowDirection): Promise<void> {
    const gamepadId = this.playerSelected?.gamepadId
    if (gamepadId === undefined) return

    const alert = await this.alertController.create({
      header: 'Waiting for Input',
      message: `Press a button on your ${GamepadService.GetDisplayName(gamepadId)} for ${ArrowDirection[arrowDirection].toUpperCase()}`,
      backdropDismiss: false,
    })

    await alert.present()
    this.waitingForInput = true

    if (gamepadId !== Player.KEYBOARD_ID)
      this.WaitForGamepadInput(gamepadId, arrowDirection, alert)
    else
      this.WaitForKeyboardInput(arrowDirection, alert)
  }

  WaitForGamepadInput(gamepadId: string, arrowDirection: ArrowDirection, alert: HTMLIonAlertElement): void {
    const checkInput = () => {
      const gamepad = DancePadGamepad.FindGamepad(gamepadId)
      if (!gamepad) {
        AppComponent.PresentWarningToast(`Gamepad not found: press one of its buttons, or reconnect it.`)
        this.waitingForInput = false
        void alert.dismiss()
        return
      }

      // Check for button presses
      for (let i = 0; i < gamepad.buttons.length; i++) {
        if (gamepad.buttons[i].pressed) {
          // Bind the action to the pressed button
          this.gampadBindings.set(arrowDirection, i)
          this.cd.markForCheck()
          this.waitingForInput = false
          void alert.dismiss()
          return
        }
      }
      if (this.waitingForInput)
        requestAnimationFrame(checkInput)
    }
    requestAnimationFrame(checkInput)
  }

  WaitForKeyboardInput(arrowDirection: ArrowDirection, alert: HTMLIonAlertElement) {
    const checkKeyboardInput = (event: KeyboardEvent) => {

      if (event.key === 'Enter') {
        AppComponent.PresentWarningToast(`'Enter' key is default "Start" and cannot be used for bindings.`)
        return
      }
      // Bind the action to the pressed button
      this.keyboardBindings.set(arrowDirection, event.key)
      this.cd.markForCheck()
      this.waitingForInput = false
      void alert.dismiss()
      window.removeEventListener('keydown', checkKeyboardInput)
    }
    window.addEventListener('keydown', checkKeyboardInput)
  }

  ValidateMapping(): void {
    if (this.playerSelected?.gamepadId === undefined || this.playerIndexSelected === undefined)
      return

    if (this.playerSelected.gamepadId === Player.KEYBOARD_ID) {
      const keyboardBindingsObject: Map<string, ArrowDirection> = new Map<string, ArrowDirection>()
      for (const [direction, key] of this.keyboardBindings.entries()) {
        keyboardBindingsObject.set(key, direction)
      }
      this.userConfigService.UpdatePlayer("keyBindingKeyboard", this.playerIndexSelected, keyboardBindingsObject)
      AppComponent.PresentOkToast("Player keyboard mappings have been updated.")

    } else {
      const gamepadBindingsObject: Map<number, ArrowDirection> = new Map<number, ArrowDirection>()
      for (const [direction, button] of this.gampadBindings.entries()) {
        gamepadBindingsObject.set(button, direction)
      }
      this.userConfigService.UpdatePlayer('keyBindingGamepad', this.playerIndexSelected, gamepadBindingsObject)
      AppComponent.PresentOkToast("Player gamepad mappings have been updated.")
    }

  }

}
