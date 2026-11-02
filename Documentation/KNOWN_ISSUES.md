# Known issues

Bugs found but not fixed yet, and deprecations to migrate. Remove an entry once it is fixed.

---

## Bugs

- **Genre autocomplete: suggestions unreachable with the keyboard**
  `OnBlur` clears the suggestion list when the input loses focus, so pressing Tab to reach a suggestion closes the list first.
  Possible fix: arrow up/down + Enter navigation from the input, with `aria-activedescendant`.

- **Two players: the precision and combo texts of player 2 are shown on player 1**
  `PlayerDisplayComponent` reads its texts with `document.getElementById('precision-text-*')!` and `'combo-text'`. With two displays, the ids are duplicated and both components get the first one's elements.
  Possible fix: `@ViewChild` / `@ViewChildren` template references in the component.

- **Music cache: the localStorage quota (about 5 MB) may be reached**
  `MusicCacheService` stores every music with its charts in localStorage (`MUSIC_<id>`). A chart weighs roughly 10 to 20 KB as JSON (more with 192-row measures): with about 280 charts, the cache is already near the quota, which is not measured yet. Nothing handles `QuotaExceededError`: once it is reached, `setItem` throws in the middle of a sync and the cache is left half written. The whole cache is also read and parsed synchronously at startup.
  Possible fix: store the musics in IndexedDB (e.g. `idb-keyval`), only `PersistMusic()`, `RemoveMusic()`, `SaveRegistry()` and the startup read change. First measure the cache size (`JSON.stringify(localStorage).length` in the console).
  Test: `tests/unit/services/local-storage/music.cache.service.spec.ts` covers the cache behavior, to keep through the migration.

- **Desktop: an XInput gamepad (Xbox and compatibles) is not linked to the system list**
  `GamepadService` links the system gamepads to the webview ids by vendor and product ids. WebView2 writes no ids in an XInput id (`Xbox 360 Controller (XInput STANDARD GAMEPAD)`), so a player's XInput gamepad shows "[disconnected]" until a button press even when plugged in, and its disabled "press a button" entry stays once the webview sees it.
  Possible fix: ask Tauri for the XInput slots (gilrs gives no link to them), or hide the system entries of Microsoft vendor id `045e` once the webview sees an XInput gamepad.

## Maintenance

- **`npm audit`**: 6 vulnerabilities (5 high, 1 moderate), accepted for now. Do not run `npm audit fix --force`: it downgrades `firebase` to 9.14.0 and `@angular/build` to 22.1.9.
  - `@grpc/grpc-js` 1.9.16, pulled by `@firebase/firestore` (`~1.9.0`): only used by the Node build of Firestore, the browser build uses WebChannel. Not in the bundle. Wait for a Firebase update.
  - `vite` 8.3.0, pinned by `@angular/build` 22.2.3: only used by `ng serve` (`ng build` uses esbuild). Dev only. Wait for `@angular/build` 22.2.4.

## Improvements

Nothing for now.
