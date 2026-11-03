import { Component, OnInit, inject } from '@angular/core'
import { IonApp, IonRouterOutlet } from '@ionic/angular'

import { AnnouncerService } from './services/gameplay/announcer.service'
import { MusicCacheService } from './services/local-storage/music.cache.service'
import { NativeGamepadService } from './services/thirdpartyapp/native-gamepad.service'
import { PresenceService } from './services/thirdpartyapp/presence.service'
import { SoundService } from './services/gameplay/sound.service'
import { ToastController } from '@ionic/angular'
import { productionConsole } from './shared/console-output'

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  private toastController = inject(ToastController)
  private presenceService = inject(PresenceService)
  private nativeGamepadService = inject(NativeGamepadService)
  private musicCacheService = inject(MusicCacheService)

  static appInstance: AppComponent

  constructor() {
    const announcerService = inject(AnnouncerService)
    const soundService = inject(SoundService)

    AppComponent.appInstance = this
    announcerService.Init().catch(error => console.error("Failed to load the announcers:", error))

    document.addEventListener('click', () => soundService.InitBackgroundMusic(), { once: true })
  }

  ngOnInit() {
    this.musicCacheService.UpdateCache()
      .then(changes => {
        if (changes)
          AppComponent.PresentOkToast(`Music list updated: ${changes.added} new, ${changes.updated} updated, ${changes.deleted} deleted.`)
      })
      .catch(error => AppComponent.PresentErrorToast("Failed to update the music list: " + error))
    void this.presenceService.Init()
    void this.nativeGamepadService.Init()
  }

  //#region Toasts
  async PresentOkToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 6000,
      color: 'success'
    })
    await toast.present()
  }

  async PresentWarningToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 6000,
      color: 'warning'
    })
    await toast.present()
  }

  async PresentErrorToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 6000,
      color: 'danger'
    })
    await toast.present()
  }
  //#endregion

  //#region Statics
  static PresentOkToast(message: string) {
    productionConsole.log(message)
    void AppComponent.appInstance.PresentOkToast(message)
  }

  static PresentWarningToast(message: string) {
    productionConsole.warn(message)
    void AppComponent.appInstance.PresentWarningToast(message)
  }

  static PresentErrorToast(message: string) {
    productionConsole.error(message)
    void AppComponent.appInstance.PresentErrorToast(message)
  }
  //#endregion
}
