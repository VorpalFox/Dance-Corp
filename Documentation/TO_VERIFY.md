# To verify

Changes that may have a runtime impact and that could not be verified when they were made.

Unless stated otherwise, the only check performed is that `npm install` then `ionic serve` compile without errors (strict TypeScript + `strictTemplates`). This guarantees types and templates, not behavior.

Remove an entry once it is verified.

---

## Commit: Uograde et cleanup des packages
Link: https://github.com/Fx73/Dance-Corp/commit/e18180e622fee2487a0f449a4bf7e44b82c079f3

Tested: every route opens in a browser with no console error related to the upgrade (logged out, no gamepad).

- src/app/shared/component/header/header.component.ts: `IonicModule` replaced by standalone Ionic imports
- src/app/shared/user/user.component.ts: `IonicModule` replaced by standalone Ionic imports
- src/app/pages/user-profile/account/account.component.ts: `IonicModule` replaced by standalone Ionic imports (form with `ngModel`)
- src/app/pages/upload/test-note/test-note.component.ts: unused `IonicModule` import removed
- tsconfig.json: `baseUrl` replaced by `paths: { "src/*": ["./src/*"] }`
- src/app.config.ts: `package.json` imported with a relative path

→ To verify:
  - Open the user popover, logged in and logged out
  - Profile/account page: edit a field
  - Upload page: open the note test
  - The version number shown in the app is correct
  - `npm run build` and the Tauri build work

## Commit: Remove unused packages
Link: https://github.com/Fx73/Dance-Corp/commit/1eb0d9adb459dd35810b34f0fa831b303f104487

- package.json: `@angular/animations` and `@angular/platform-browser-dynamic` removed (unused in the code)

→ To verify:
  - Ionic animations still work (modals, popovers, page transitions)

## Commit: Migration *ngIf/*ngFor vers @if/@for
Link: https://github.com/Fx73/Dance-Corp/commit/0e0698b2e908e4e06f9b3cfc44b58f4ddce3deef

- src/app/shared/user/login/login.component.html: `*ngIf` → `@if`
- src/app/pages/upload/upload.page.html: `*ngIf` / `*ngFor` → `@if` / `@for`
- src/app/pages/options/pad-test/pad-test.page.html: `*ngIf` / `*ngFor` → `@if` / `@for`
- src/app/pages/player-selection/player-selection.page.html: `*ngFor` → `@for`
- src/app/pages/user-profile/user-profile.page.html: `*ngIf` → `@if`
- src/app/pages/upload/test-note/test-note.component.html: `*ngIf` → `@if`
- src/app/game/game-display/player-display.component.html: `*ngIf` → `@if`
- 10 component files: unused `CommonModule` / `NgIf` imports removed

→ To verify:
  - Login form and its validation error messages
  - Pad test: gamepad list, players and key mapping
  - Player selection: player list, user and gamepad selects
  - Upload: notes list, bgChanges list, delete button icon
  - User profile: avatar
  - In game: "Training Mode" and "Failed" labels

## Commit: Renommage des @Output préfixés par "on"
Link: https://github.com/Fx73/Dance-Corp/commit/0e0e22a90dfaff4d0774eb5c0e6cf0b48b9a2188

- src/app/game/music-player/*: `onReady` output renamed to `ready` (YouTube, SoundCloud, local players and `IMusicPlayer`)
- src/app/game/game-display/waiting-screen/waiting-screen.component.ts: `onCountdownFinished` renamed to `countdownFinished`
- game, browse and test-note templates: bindings updated

→ To verify:
  - Start a game with a YouTube, a SoundCloud and a local song: the countdown ends and the music starts
  - Browse: the song preview starts
  - Upload: the note test plays the music

## Commit: Préfixe app- pour les sélecteurs des composants d'upload
Link: https://github.com/Fx73/Dance-Corp/commit/02815315f8165b112f3856a7c66a951b8729f616

- src/app/pages/upload/*: `music-*` selectors renamed to `app-music-*` (editable field, autocomplete, list, select)

→ To verify:
  - The upload page shows all its fields (text, lists, selects, genre)

## Commit: Nettoyage des hooks de cycle de vie
Link: https://github.com/Fx73/Dance-Corp/commit/a48789a20ac17306ebec50f11f47167a0c65a2b4

- src/app/game/music-player/music-player-soundcloud/music-player-soundcloud.component.ts: empty `ngAfterViewInit` and `AfterViewInit` interface removed
- about, pad-test, player-selection, user-profile pages and waiting-screen: empty `ngOnInit` removed

→ To verify:
  - SoundCloud player: loading and playback

## Commit: Migration vers inject() : services et guard
Link: https://github.com/Fx73/Dance-Corp/commit/a6b0e70bbc0eb333b340cf732b1a55e5645237b8

- src/app/services/**, src/app/shared/guard/user.guard.ts: constructor injection replaced by `inject()` (automatic Angular migration)

→ To verify:
  - Login and logout
  - Pages protected by the guard redirect when logged out and open when logged in
  - Songs load from Firestore

## Commit: Migration vers inject() : composants et pages
Link: https://github.com/Fx73/Dance-Corp/commit/2d66e12bd6d3600f359aeb837c43410ab8dcc163

- 20 component and page files: constructor injection replaced by `inject()` (automatic Angular migration)

→ To verify:
  - Every page opens and works as before (smoke test)

## Commit: Accessibilité de la liste d'autocomplétion des genres
Link: https://github.com/Fx73/Dance-Corp/commit/5315b558a4c67bd410bba0244f8503f45dec9a24

- src/app/pages/upload/editable-field-autocomplete/editable-field-autocomplete.component.html: suggestions get `tabindex`, `aria-selected` and selection with Enter; list gets `id="genre-list"`

→ To verify:
  - Upload: type a genre and click a suggestion, it is added as before

## Commit: Typage de la config utilisateur et des services audio (no-explicit-any)
Link: https://github.com/Fx73/Dance-Corp/commit/6a96d7cdcdb3821793901ce82fd755a93a65dc82

- src/app/services/userconfig.service.ts: typed `getConfig()` / `updateConfig()` / `updatePlayer()`, `showPlayerDisplay = false` added to `UserConfig`
- src/app/pages/options/options.page.ts: typed config accessors, raw Ionic values kept as is
- src/app/services/gameplay/sound.service.ts: fade intervals stored in a `Map` instead of a property added on the audio element
- src/app/services/gameplay/announcer.service.ts: typing only (`SoundBank`)

→ To verify:
  - Options page: change every setting, reload the page, settings are kept
  - Options page: change the number of players
  - Navigate between menu and game: the background music fades in and out, with no cut or overlap
  - Options: announcer volume test; in game, announcements and applause trigger

## Commit: Typage des paramètres d'événements (no-explicit-any)
Link: https://github.com/Fx73/Dance-Corp/commit/74c660be0eb0654e76004b5736545f19903b0cb6

- src/app/game/music-player/music-player-local/music-player-local.component.ts: **bug fix**, the slider value is a string, so `value + startOffset` concatenated (`"12" + 0` → `"120"`). The slider now goes through `onSeekInput`, which converts to a number
- src/app/game/music-player/music-player-local/music-player-local.component.ts: **bug fix**, `setToTime(time: number)` now matches `IMusicPlayer`; it previously expected an event, so `player.setToTime(start)` from browse crashed for local songs
- src/app/pages/upload/editable-field*/: `ion-input` value converted to a string before `SanitizeSscInput`
- src/app/pages/upload/upload.page.ts: `files?.[0]` when loading a file

→ To verify:
  - Local song: move the slider, playback resumes at the chosen position (also with a non-zero `startOffset`)
  - Browse: select a local song, the preview starts at the right position with no console error
  - Upload: edit a text field and a number field (offset, sample start), the value is kept and flagged as changed
  - Upload: load a `.sm`, a `.ssc` and an `.essc` file

## Commit: Typage générique des composants d'édition de l'upload (no-explicit-any)
Link: https://github.com/Fx73/Dance-Corp/commit/d25678e6e20c7aaef4d458724d8f6a79131672ef

- src/app/pages/upload/*: editable field, autocomplete, select and editable list components made generic (typing only, emitted values unchanged)

→ To verify:
  - Upload: edit each kind of field (text, number, genre, dance type and difficulty selects, BPM and background lists), changes are kept and flagged

## Commit: Typage du parsing et de la sérialisation (no-explicit-any)
Link: https://github.com/Fx73/Dance-Corp/commit/c2352e96bd68dec2812f1050c360f8e728233e51

- src/app/pages/upload/reader.ssc.ts: `getOrderedFields` uses `Object.entries`, `writeEsscValue` uses `String(value)`
- src/app/pages/upload/upload.page.ts: protected fields copied with `Object.assign`
- src/app/services/firestore/firestore.converter.ts: retyped (`DocumentData`), default parameter instead of `if (dto === undefined)`
- src/app/game/game-model/*: typed `fromJSON` (MusicDto, NoteDataDto, Measures, Player)

→ To verify:
  - Upload: load a song that already exists in the database, protected fields take the database values
  - Upload a song, then reload it from the database

## Commit: Typage des API externes : widget SoundCloud et flag zone.js (no-explicit-any)
Link: https://github.com/Fx73/Dance-Corp/commit/ed6082e1be043df7db7742dd534063d229f13203

- src/app/game/music-player/music-player-soundcloud/music-player-soundcloud.component.ts: `polling` initialized to `undefined` instead of `null`
- src/zone-flags.ts: `Object.assign(window, ...)` instead of `(window as any)`

→ To verify:
  - SoundCloud song: the position advances, pause and resume work

## Commit: Remove unused parameters required by API signatures
Link: https://github.com/Fx73/Dance-Corp/commit/9540ad00c393c2b7c5df0696aa55dc26097ca249

- src/app/shared/guard/game.guard.ts: unused `(route, state)` parameters removed from the `CanActivateFn`
- src/app/services/firestore/user.firestore.service.ts: unused `options` parameter removed from `fromFirestore` (`FirestoreDataConverter`)

→ To verify:
  - Start a game from browse: `/play/game/:musicId` opens (guard returns true)
  - Log in: the user profile (name, avatar, level, stats) loads from Firestore

## Commit: Replace deprecated ion-img with native img
Link: https://github.com/Fx73/Dance-Corp/commit/734e63312300ae8be977662c74dac822c5626f0c

- browse, browse-upload, upload, user-profile pages and header: `<ion-img>` replaced by `<img>`, with `display: block` / `object-fit: contain` to keep the `ion-img` rendering; jackets use `loading="lazy"`

→ To verify:
  - Browse and browse-upload: jackets are not stretched and keep their black background; single/double icon on the chart cards
  - Upload: background and jacket previews take the card width
  - User profile: the avatar stays round
  - Header: logo size, clicking it goes to home
  - The `ion-img` deprecation warning is gone from the console

## Commit: Fix user music converter key so notes become UserNoteDto
Link: https://github.com/Fx73/Dance-Corp/commit/9858943905c305871b6b089d1fb253fa41d6cdb4

- src/app/services/firestore/user.firestore.service.ts: **bug fix**, subtype key `"notes:"` renamed to `notes`

→ To verify:
  - Log in: the user stats per chart (passed, times played, high score) load as before in browse and the profile

## Commit: Read every player's chart index from the game URL
Link: https://github.com/Fx73/Dance-Corp/commit/557c6dcbe9c7bab2cc1234ed972cc53979e6e60b

- src/app/game/game.page.ts: **bug fix**, `queryParamMap.getAll('notes')` instead of `get('notes')?.split(',')`

→ To verify:
  - 1 player: a game starts with the selected chart
  - 2 players with different charts: each player gets their own chart

## Commit: Save each player's stats against the chart they played
Link: https://github.com/Fx73/Dance-Corp/commit/aecd1f1dcaee60e6d4f782d9fe83790be461f896

- src/app/game/game.manager.ts: **bug fix**, `GameOver()` saves each round under its selected chart instead of `noteData[0]`
- src/app/game/game.page.ts: **bug fix**, the Discord presence shows the level of the selected chart

→ To verify:
  - Tauri: the Discord presence shows the played level

## Commit: Start the crowd sound fade-out once its duration is known
Link: https://github.com/Fx73/Dance-Corp/commit/a08a8da908cb49eee344a5fe127ac317b1f3ed3d

- src/app/services/gameplay/announcer.service.ts: **bug fix**, the crowd fade-out is scheduled on `loadedmetadata`, as `audio.duration` is `NaN` right after `play()`

→ To verify:
  - End of a game: applause or boos now play until 4 s before their end, then fade out (they were cut almost at once before)

## Commit: Make UserGuard wait for the session and the user document
Link: https://github.com/Fx73/Dance-Corp/commit/703b1b1f9744906d4650054aefbe3c794efd2e42

- src/app/shared/guard/user.guard.ts: **bug fix**, waits for `authStateReady()` instead of a 500 ms timeout, then for `userData` to be set (5 s timeout, it was never awaited); redirects with a `UrlTree`

→ To verify:
  - Logged out: `/upload`, `/browse-upload` and `/user-profile` redirect to home
  - Logged in: navigating to these pages from the menu opens them
  - Logged in: reloading these pages (F5) opens them with the user loaded (profile shows name and stats, upload works with no "User not authenticated")

## Commit: Redirect browse and game to player selection when players are not ready
Link: https://github.com/Fx73/Dance-Corp/commit/40d60f76012fedc3f50e51431978a308af35b3ae

- src/app/shared/guard/players.guard.ts: **bug fix**, `gameGuard` replaced by `playersGuard` on `/play/browse` and `/play/game/:musicId`, redirects to `/play/player-selection` when a player has no gamepad or an undetected one
- src/app/services/userconfig.service.ts: `ArePlayersReady()` shared with the player selection page; `isReady` removed (always true)

→ To verify:
  - Fresh profile (localStorage cleared): open `/play/browse` directly, it redirects to player selection with no console error
  - Keyboard player: reload `/play/browse`, it stays on browse
  - Gamepad player: reload `/play/browse`, it redirects to player selection; press a button, Start goes back to browse
  - Normal flow: player selection → browse → game → back to browse

## Commit: Remove DancePadKeyboard window listeners when the pad is destroyed
Link: https://github.com/Fx73/Dance-Corp/commit/09555de9bbe67b939110580e0b20b5d2e4362627

- src/app/game/game-controller/*: **bug fix**, `IDancePad.Destroy()` added; `DancePadKeyboard` removes its `keydown` / `keyup` listeners, `DancePadGamepad` has nothing to release
- src/app/game/game.manager.ts: `DestroyGame()` destroys each round's pad
- src/app/pages/browse/browse.page.ts: `ngOnDestroy()` destroys the browse pads

→ To verify:
  - Keyboard player: browse navigation with the arrows, play a game, back to browse, play again: inputs work every time
  - Upload: the note test works with the keyboard, close it and reopen it
  - Gamepad player: same flow, inputs still work

## Commit: Stop the upload page loading forever when the music is not found
Link: https://github.com/Fx73/Dance-Corp/commit/9faed688d302786b1c89fd359001ceee56dcd330

- src/app/pages/upload/upload.page.ts: **bug fix**, `StartLoad()` stops loading and shows the "Music not found" toast when the music is neither local nor in the database; dead `DeepClone()` fallback removed

→ To verify:
  - `/upload?music=<unknown id>`: error toast, then the file picker is shown
  - Database-only music: shown read only, "Edit Music" makes it editable
  - Local music (with or without a database version): opens in edit mode as before

## Commit: Send the selected charts to the game by chartName
Link: https://github.com/Fx73/Dance-Corp/commit/560619692a1d338379dab7c23d6924fb5a5e4b62

- src/app/pages/browse/browse.page.ts: **bug fix**, `RunGame()` sends the selected `chartName`s in the `notes` query param instead of indexes into the filtered list
- src/app/game/game.page.ts: **bug fix**, chart names resolved in `music.noteData`; unknown chart name redirects to home

→ To verify:
  - 1 player, music with single and double charts: each selected chart is the one played (level, notes), for several charts of the list
  - 2 players with different charts: each player gets their own chart
  - After the game: score and "passed" are shown on the played chart in browse
  - Chart name with spaces or special characters: the game starts

## Commit: Move scoring, judgment and announcer values to CONFIG
Link: https://github.com/Fx73/Dance-Corp/commit/00ded672f5b371cda855cf60ba988da1b0479f07

- src/app/game/constants/game-config.ts: `JUDGMENT`, `SCORE`, `PERFORMANCE` and `ANNOUNCER` sections, same values as before
- src/app/game/game-model/gameRound.ts, src/app/services/gameplay/announcer.service.ts, src/app/game/game.manager.ts: inline values replaced by `CONFIG`; `SatisfactionType` enum instead of `0` / `1` / `2`; `GameRound.MAX_SCORE` moved to `CONFIG.SCORE.MAX`

→ To verify:
  - Announcer combo lines and end of game applause still trigger

## Commit: Remove debug logs and silence the console in production
Link: https://github.com/Fx73/Dance-Corp/commit/21354a2e0ac4aaaa6d0cec79fbff19dcd3cf3df5

- 14 files: debug `console.log` removed (object dumps, per-arrow judgments, satisfaction, protected field check, chart name parsing, token maps, email on register error)
- src/app/shared/console-output.ts: `SilenceConsole()` and `productionConsole`
- src/main.ts: `SilenceConsole()` called in production
- src/app/app.component.ts: toasts log through `productionConsole`
- browse and browse-upload pages: infinite scroll easter egg logs through `productionConsole`

→ To verify:
  - `ionic serve` (development): the remaining logs show (loading, cache sync, game start and game over)
  - Production build (`npm run build`, then serve `website/www`): only toasts, errors and the infinite scroll message show in the console
  - Tauri build: same as production

## Commit: Add a dev Firebase project and split CI from deployment
Link: https://github.com/Fx73/Dance-Corp/commit/74bdcf4bcc92c2329414404b33c319684c1a4e55

Tested: `ng build --configuration=dev` only contains `dance-corp-dev`, `ng build --configuration=production` only contains `dance-corp`.

- src/environments/environment.ts, environment.prod.ts: Firebase config moved here from src/app.config.ts, dev project by default
- src/main.ts: Analytics only starts when a `measurementId` is set
- angular.json: new `dev` build configuration
- src-tauri/tauri.dev.conf.json: separate "DanceCorp Dev" desktop app for dev builds
- .github/workflows/ci.yml, deploy.yml: replace build_deploy_web.yml and build_desktop.yml

→ To verify:
  - The CI workflow passes on a PR: lint, build, preview URL comment, desktop build
  - A push to `dev` deploys to dance-corp-dev, a push to `master` to dance-corp
  - The desktop artifact contains the `.msi` and `.exe` installers
  - The "DanceCorp Dev" app installs next to the release app and keeps its own AppData
  - Production still records Analytics

## Commit: Deploy the Firestore rules from the repo and tighten them
Link: https://github.com/Fx73/Dance-Corp/commit/9106f353e00a06c5580a637dc4ac780ec91d544f

Tested: 32 allow/deny cases in the Firestore emulator (protected fields, bpms with and without notes, delete, metadata shape and index guard, fresh DB). Rules deployed to dance-corp-dev.

- website/firestore.rules: delete blocked while notes remain, bpms protected once notes exist, metadata writes restricted and checked
- src/app/services/firestore/music.firestore.service.ts: `GetProtectedFields()` adds `bpms` when the music has notes; `AddGenres` creates `musicdata` if missing
- src/app/pages/upload/upload.page.ts: uses `GetProtectedFields()`
- .github/workflows/deploy.yml: deploys the rules and indexes

→ To verify:
  - Upload a music, add notes, edit it, delete its notes then the music, on the dev site
  - Changing the bpms of a music without notes works; with notes, the client refuses it with a clear message
  - The Deploy workflow deploys the rules (the service account may need the Firebase Rules Admin role)

## Commit: Update Tauri crates to match the npm packages
Link: https://github.com/Fx73/Dance-Corp/commit/5e545eb43484fab8b1c9b2182db9573161d122ed

Tested: `cargo check` and `npx tauri build` (MSI and NSIS bundles) pass locally.

- src-tauri/Cargo.toml, Cargo.lock: tauri 2.12.5, tauri-build 2.7.4, tauri-plugin-fs 2.7.1, tauri-plugin-log 2.10.1
- package.json: `@tauri-apps/cli` 2.12.4

→ To verify:
  - Desktop app: upload a music (folder created, file written), it shows in the local list, plays, and can be deleted
  - Discord presence shows "Let's dance !"
  - Steam presence, when launched through Steam

## Commit: Store charts in a notes subcollection so only their creator can change them
Link: https://github.com/Fx73/Dance-Corp/commit/71e589939151b69b7fd92c4f3a2475040202d89d

Tested: 29 allow/deny cases in the Firestore emulator (chart creation, edit and deletion by creator and others, index tampering, music deletion, bpms lock, legacy noteData). Dev migrated and read anonymously with the client SDK: 65 musics, 276 charts, no orphan, every index matches its subcollection.

- website/firestore.rules: notes subcollection rules, chart index consistency, collectionGroup read
- src/app/services/firestore/music.firestore.service.ts: charts read from and written to the subcollection, `MusicDto.noteData` rebuilt on read
- src/app/pages/upload/upload.page.ts: `GetProtectedFields` takes the chart count
- tools/migrate-notes-to-subcollection.mjs, copy-prod-to-dev.mjs: migration, and the copy follows the subcollections

→ To verify (on the PR preview, against dance-corp-dev):
  - Clear the site data, reload: every music shows its charts
  - Upload a chart, edit it, delete it
  - Another browser with a warm cache picks up an added and a deleted chart

## Commit: Bump the version automatically: patch on dev, minor on release
Link: https://github.com/Fx73/Dance-Corp/commit/a4ca8bc5c599db357ed91ec77c3037bce2647e44

Tested: `commit-version.sh` on a throwaway branch creates a signed commit with package.json and package-lock.json. Workflow YAML is valid. The workflows themselves only run after the merge.

- .github/workflows/deploy.yml: `version` job (patch bump on dev, tag on master), web and desktop build its commit
- .github/workflows/release.yml: minor bump on dev when a dev -> master PR opens
- .github/scripts/commit-version.sh: signed commit through the GitHub API

→ To verify:
  - Merging this PR bumps dev to 1.0.2, and the dev site and DanceCorp Dev installers show 1.0.2
  - The bump commit does not start another Deploy run
  - Opening the dev -> master PR bumps dev to 1.1.0, and the PR shows that commit
  - The merged master deploy shows 1.1.0 and creates the v1.1.0 tag

## Commit: Await async calls or mark them as fire-and-forget
Link: https://github.com/Fx73/Dance-Corp/commit/478f5a59871c7b883cd5ca8c6226eeaaf08ed593

- src/app/services/firestore/music.firestore.service.ts: `AddGenres()`, `UpdateMusicIndex()` and `RemoveMusicFromIndex()` awaited, a failure now shows the error toast instead of the success one
- src/app/services/local-storage/music.cache.service.ts: `UpdateCache()` no longer throws (error toast), awaited in the `catch` blocks; corrupted cache entries are logged and removed from the cache and the registry
- src/app/pages/upload/upload.page.ts: `DeleteNote()`, `DeleteFile()` and `SwitchToDbPage()` are async and wait for each step before reloading and showing their toast
- src/app/services/thirdpartyapp/presence.service.ts: `Update()` and `Clear()` catch their errors
- src/app/services/firestore/user.firestore.service.ts, src/app/services/local-storage/user.cache.service.ts: toast when the profile, the scores or a new score fail to load or save
- src/app/app.component.ts: toasts awaited, announcers loading errors logged

→ To verify:
  - Upload a new music with a genre, update it: one success toast, the music and the genre appear in another browser
  - Delete a chart from the database: the page reloads without it, the success toast comes after the reload
  - Discard a local edit of a database music: the database version is reloaded
  - Load a `.sm` file of a music that already exists in the database: the page switches to the database music
  - Desktop: Discord and Steam presence still update when changing pages
  - Finish a song logged in: the score is saved

## Commit: Leave the game when the music does not start, log blocked sounds
Link: https://github.com/Fx73/Dance-Corp/commit/17548287a100f9c411a4e3de4f018254e17a6645

- src/app/game/game.manager.ts: `StartGame()` gives up after `MUSIC_START_TIMEOUT` (15 s) if the music time does not move, and stops waiting if the game is destroyed
- src/app/game/game.page.ts, src/app/pages/upload/test-note/test-note.component.ts: error toast, then back to browse (game) or the modal closes (chart test)
- src/app/game/music-player/music-player-local/music-player-local.component.ts: `isPlaying` only set once playback has started
- src/app/services/gameplay/sound.service.ts: `SoundService.PlaySound()` logs a blocked or failed sound; used by the sounds, the announcers and the mine hit

→ To verify:
  - A normal game starts as before, on YouTube, SoundCloud and a local song (desktop)
  - A YouTube music whose video is unavailable: after 15 s, error toast and back to browse
  - Leave the game during the countdown: no toast and no navigation afterwards
  - Open the app and play with a pad only, without any click: the music starts, or the game goes back to browse after 15 s
  - Upload page, chart test with an unavailable music: error toast, the modal closes

## Commit: Pass charts instead of indexes to the game, keep the browse chart selection valid
Link: https://github.com/Fx73/Dance-Corp/commit/6654a7d8eb9ce4a23c6449dabcb85d66c2af3b76

- src/app/game/game.manager.ts, src/app/game/game.page.ts: `GameManager` takes the selected `NoteDataDto` instead of indexes in `music.noteData`
- src/app/pages/upload/test-note/test-note.component.ts: the chart test plays the tested chart (it always played the first one), with the real `UserCacheService` and `AnnouncerService` (null before, which made `GameManager` throw)
- src/app/pages/browse/browse.page.ts: on a music change, each player's chart selection is clamped to the new music's charts; unused `TrySetSelectedMusicById` removed

→ To verify:
  - A game in single and multiplayer plays the selected charts, and the score is saved on the right chart
  - Upload page: testing a chart other than the first plays that chart; the announcer may now react during the test
  - Browse: select the last chart of a music with many charts, move to a music with fewer: its last chart is selected, and Enter starts the game

## Commit: Remove unnecessary optional chains, type missing values truthfully
Link: https://github.com/Fx73/Dance-Corp/commit/820fecd7d29bd013082e80c61626a091e38c2e56

- src/app/game/game-model/music.dto.ts: SSC token maps typed as partial; a missing `#SAMPLESTART` / `#SAMPLELENGTH` gives `undefined` instead of `NaN`; a chart without `#DIFFICULTY`, `#METER` or `#NOTES` no longer throws (Challenge, 0, empty chart)
- src/app/pages/upload/reader.ssc.ts: an empty `#BPMS` tag no longer throws
- src/app/game/music-player/music-player-local/music-player-local.component.ts: the audio element is created with the component, its source is set in `ngOnInit`
- src/app/services/gameplay/announcer.service.ts: announcer lines typed as partial, a random line skips a category without lines
- src/app/pages/upload/upload.page.ts, src/app/services/firestore/music.firestore.service.ts: optional chains and null checks on values always present removed

→ To verify:
  - Upload a `.sm` and a `.ssc` file, with and without `#SAMPLESTART`: the browse sample starts at the given time, or at 0
  - Upload page: the genre suggestions load
  - Desktop: a local song plays in browse and in game
  - Announcers still speak during a game and in the menus

## Commit: Remove unnecessary conditions and enable no-unnecessary-condition
Link: https://github.com/Fx73/Dance-Corp/commit/2e9994fbfdfdac4f6c6cae028d996c6d6c2cc0c1

- src/app/services/gameplay/sound.service.ts, announcer.service.ts, src/app/game/music-player/IMusicPlayer.ts, src/app/game/game.page.ts: `?? default` removed on `GetConfig()`, the `UserConfig` defaults apply
- src/app/game/game.manager.ts: background change lookup bounded by the list length
- src/app/game/game.page.ts: `musicPlayer` nullable, the game starts once both the player and the displays are ready
- src/app/shared/component/radar-score/radar-score.component.ts: `radar` optional until the view exists, changes tested with `in`
- src/app/services/gameplay/gamepad.service.ts: a reconnected gamepad is reassigned only when a player had it
- Others: defaults on DTO fields that always have a value removed

→ To verify:
  - Fresh browser (no saved config): menu music, effects and announcers play at the default volumes
  - The difficulty radar draws on the browse page and on the upload page
  - Disconnect and reconnect an assigned gamepad: it is reassigned to its player

## Commit: Show toasts in the pages, services throw

Link: https://github.com/Fx73/Dance-Corp/commit/e29d19f518c974b541f3d7d85ccc9261279a818b

- src/app/services/firestore/music.firestore.service.ts: no more toasts, errors propagate
- src/app/services/local-storage/music.cache.service.ts: `UpdateCache()` throws and returns the number of changes; a failed resync after a failed write is only logged
- src/app/app.component.ts: shows the music list update toast at startup (now also on the first load of a device), or its error
- src/app/pages/upload/upload.page.ts: each action shows its own error toast; one success toast per action instead of two
- src/app/services/firestore/login.fireauth.service.ts, src/app/shared/user/login/login.component.ts, src/app/pages/user-profile/account/account.component.ts, src/app/shared/user/user.component.ts: toasts in the components, browser alerts replaced by toasts, password recovery fixed (it called itself)

→ To verify:

- Upload, update and delete a music, upload and delete a chart: one success toast each; offline, one error toast each
- Startup with new musics on the server: the "Music list updated" toast
- Login with a wrong password, register with a used email: a warning toast, no browser alert
- Password recovery: the email is sent, with a success toast
- Account page: update the profile and the password, resend the verification email, log out

## Commit: Drop the legacy noteData checks from the Firestore rules
Link: https://github.com/Fx73/Dance-Corp/commit/9c523a4e28d702241156a36cb480ae3647948725

- website/firestore.rules: `noteData` no longer forbidden on music create/update, nor checked before a music deletion

→ To verify (after the dev deploy):
  - The Deploy workflow publishes the rules without error

## Commit: Remove the non-null assertions that a narrowing or a guard makes useless
Link: https://github.com/Fx73/Dance-Corp/commit/e0138f118fe4de34a7aec4be79a7f2088106bfe3

Tested: lint and build only.

- dancepad-keyboard.ts, dancepad-gamepad.ts: binding read once with `get()` instead of `has()` then `get()!`
- browse.page.ts, browse-upload.page.ts: the search skips a music without title or artist instead of throwing
- game.page.ts: `InitGame` returns early when no game was created
- gameRound.ts, player-display.component.ts: precision messages carry their precision (`PrecisionMessage`) instead of the arrow; mines push none, the display already ignored them
- user-profile.page.ts/.html, account.component.ts: profile typed nullable and shown under `@if`, unused `userAuth` removed
- pad-test.page.ts, userconfig.service.ts, upload.page.ts, IMusicPlayer.ts, test-note.component.ts: values captured or guarded before use, no behavior change

→ To verify:
  - Play a song with a gamepad: every arrow and Start respond
  - Precision texts show on their arrow; nothing on a mine (blocked by the "Mines are judged like taps" known issue)
  - Search by title and by artist in Browse and in Browse upload
  - Remap a keyboard and a gamepad in Options, the mapping is saved
  - Profile page: account fields and profile card filled
  - Upload: Edit Music and Export Essc on a database music

## Commit: Keep timed change values non-null in the upload list editor
Link: https://github.com/Fx73/Dance-Corp/commit/65a86e496010bc0f25ba381793f5ad6010bdb392

Tested: lint and build only.

- src/app/pages/upload/editable-list/editable-list.component.ts: an emptied text value becomes `""` instead of `null`, the `eslint-disable` is gone

→ To verify:
  - Upload page, edit a text list (labels, bgchanges): empty a value, the field stays empty and the music can be updated
  - Export Essc after emptying a value: the line is written `time=` instead of `time=null`

## Commit: Play a hold without a tail as a tap
Link: https://github.com/Fx73/Dance-Corp/commit/b006cabde6596df7a4817385b726d63b6147f779

Tested: lint and build only.

- arrow.ts, gameRound.ts, player-display.component.ts: hold length read from `Arrow.holdLength` instead of `beatEnd!`

→ To verify:
  - A chart with holds and rolls: holds drawn to their tail

## Commit: Reject a music file without title, artist or BPMs
Link: https://github.com/Fx73/Dance-Corp/commit/9f55b76516006a3d44fee6da950a755b4a9704ee

Tested: lint and build only.

- reader.ssc.ts: `ParseFile` throws when `#TITLE`, `#ARTIST` or `#BPMS` is missing or empty, naming the missing tags
- upload.page.ts: a file that cannot be read shows an error toast instead of an unhandled error (also for an unsupported extension)
- music.dto.ts: `bpms` defaults to `[]`, `id` throws a clear error without artist or title

→ To verify:
  - Upload a file without #TITLE: error toast naming the tag, nothing loaded
  - Upload a file with another extension: error toast

## Commit: Give a hold without a tail the length of one row
Link: https://github.com/Fx73/Dance-Corp/commit/3acf08ac34b47163a777f5195818d98689df9782

Tested: partly played by hand, lint and build.

- arrowManager.ts: a hold (or roll) ends on the next row until its tail is read, so a missing tail leaves the shortest hold instead of a tap; a tail closes its hold

→ To verify:
  - A chart with a hold missing its tail: that arrow shows as a one-row hold

## Commit: Follow the gamepads by id, through disconnections and reconnections
Link: not known yet (the commit holds its own entry)

Tested: unit tests with a mocked `navigator.getGamepads()`, lint and build. Not played with a real gamepad.

- dancepad-gamepad.ts: the pad finds its gamepad by id each frame (known index first); a missing gamepad gives no input and releases its arrows
- dancepad.factory.ts, gameRound.ts, browse.page.ts: one factory builds the pad of a player
- player.ts: `gamepadId` replaces `gamepad` (`{ index, id }`); a player saved before keeps its gamepad
- gamepad.service.ts: toast when the gamepad of a player connects or disconnects
- userconfig.service.ts, player-selection.page.ts, pad-test.page.ts: no index stored anymore, the gamepad is looked up by id

→ To verify:
  - A player saved before this version keeps their gamepad and their key mapping
  - Play with a gamepad: every arrow responds
  - Unplug the gamepad during a game: warning toast, no arrow stays held; plug it back: toast, and it plays again (after a button press if the browser asks for one)
  - Same in Browse: unplug, plug back, the gamepad navigates again
  - Options, pad test: bind a button of a gamepad; with the gamepad unplugged, a warning toast and the binding popup closes

## Commit: Let a game start before the browser has seen the gamepads
Link: not known yet (the commit holds its own entry)

Tested: lint, build and unit tests. Not played with a real gamepad.

- userconfig.service.ts: players are ready once each one has a gamepad chosen, seen by the browser or not
- player-selection.page.ts: the "press a button" line no longer blocks the start
- browse.page.ts: a toast asks each player whose gamepad is not seen yet to press one of its buttons

→ To verify:
  - Reload the app with a gamepad plugged, without touching it: Start is enabled, Browse shows the "press a button" toast
  - Press a button of the gamepad: the "connected" toast shows, and the gamepad navigates; judge whether these two toasts are smooth enough

## Commit: Desktop: tell whether a gamepad is plugged in before the webview sees it
Link: not known yet (the commit holds its own entry)

Tested: `cargo check`, lint, build, unit tests with the Tauri IPC mocked. Not run in the desktop app, no real gamepad.

- src-tauri/src/gamepad.rs, lib.rs: a thread watches the gamepads with `gilrs`, `list_gamepads` lists them, `native-gamepad-connected` / `native-gamepad-disconnected` are emitted
- native-gamepad.service.ts: desktop only, keeps the list and matches a webview gamepad id by its vendor and product ids
- gamepad.service.ts: `GetStatus()` (active, plugged, unplugged, unknown), toast when the gamepad of a player is plugged in before the webview sees it
- player-selection.page.ts, browse.page.ts: an unplugged gamepad is told apart from one waiting for a button press

→ To verify (desktop app):
  - `npx tauri dev` starts, the console logs the gamepads plugged in
  - A gamepad with "Vendor: … Product: …" in its id (most dance pads), plugged before the app starts: player selection says to press a button; unplugged: says it is not plugged in
  - Plug it while the app runs: the "plugged in, press one of its buttons" toast shows, then "connected" after a press
  - An XInput gamepad (Xbox): no vendor in its id, the status stays "press a button" as in the browser
  - The inputs in game are not slowed down by the watch thread

## Commit: Gamepad lists: web names, system gamepads before a button press, OnPush refreshes
Link: not known yet (the commit holds its own entry)

Tested: lint, build and unit tests. Not run in the desktop app, no real gamepad.

- gamepad.service.ts: the list holds the webview gamepads by their short name, the players' gamepads not seen yet ("[disconnected]" unless the system sees them), and the system-only gamepads, disabled with "press a button"
- native-gamepad.service.ts: the system list is a signal, a system gamepad is matched to webview ids by vendor and product
- pad-test.page.*, player-selection.page.html: options tracked by id and label so that ion-select refreshes its text; key mapping refreshed right after a bind; "Not Set" no longer shown for button 0
- player-selection.page.*: player 0 shows the logged user from the signal
- browse.page.ts, gamepad.service.ts, pad-test.page.ts: toasts and messages show the short gamepad name

→ To verify:
  - Options, key mapping: the LEFT arrow bound to button 0 shows "0", and a new binding shows at once, gamepad and keyboard
  - Desktop, gamepad given to no player: listed greyed "Retro Controller (press a button)"; a button press turns it into "USB Gamepad", selectable
  - Desktop, gamepad given to a player, app restarted without a press: the selects show "USB Gamepad" directly
  - Gamepad given to a player, unplugged (or in the browser before a press): "[disconnected] USB Gamepad", the binding kept; a press removes "[disconnected]" in the select at once
  - Player selection, logged in: player 0 shows the user name at once, not "Anonymous"
