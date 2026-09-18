# Windows XP Simulator

![Windows XP Simulator – the English desktop with Internet Explorer open](docs/screenshot.jpg)

A dependency-free Windows XP experience in HTML, CSS and JavaScript, speaking English, Hungarian and German.

**[Live demo – try it in your browser](https://windows-xp.levente.net/)**

## Running it

Opening `index.html` directly works. Saves belong to one browser and one address, so use it consistently at the same address. There is no build step, no npm install and no CDN.

## Languages

The interface speaks English, Hungarian and German. The browser's own language decides by default; anything else starts in English. The choice can be changed in Control Panel → Date, Time, Language, and Regional Options → **Regional and Language Options**, and it survives until the next start.

Dates, clocks and number formats follow the language: a Monday reads `Montag, 7. September 2026` in German and `Monday, September 7, 2026` in English. The documents and folders created on the first run are named in the machine's language too.

The code uses stable `text_*` keys, such as `t('text_open')`. The English, Hungarian and German text each live in their own `lang/<code>.js` dictionary, and the tests check that all three hold exactly the same keys. A new language needs one new dictionary and one line in the list in `js/lang.js`.

## What it does

- Loading XP, signing in by clicking your name, the welcome screen, logging off, switching users, standby, shutting down and restarting.
- Switching users leaves the session running: programs stay open, the sign-in screen says how many are running under each name, and coming back continues where it left off — the Pinball game included. Logging off, by contrast, closes that session, while restarting and shutting down close all of them. A session sent to the background does not interfere with the other: Media Player falls silent, and the Users tab of Task Manager shows it as "Disconnected".
- Administrator and Guest accounts. Guest is on by default and can be turned off in User Accounts. Its picture is Windows' own suitcase, and cannot be changed. Every account gets its own desktop, documents, wallpaper, favourites and settings; the computer name, the Security Center and the state of the Guest account itself are shared. Guest may change only its own picture.
- The Recycle Bin asks before it takes anything ("Are you sure you want to send this to the Recycle Bin?"), dropping included. Minimising, maximising and restoring windows, and logging off, play the original XP sounds.
- The Start menu remembers: the left column offers the five most-used programs under the pinned Internet and Email.
- Desktop icons snap to a grid and swap places when they collide. The Recycle Bin starts at the bottom right, can be moved anywhere, and stays where it was put.
- A Games folder on the desktop, holding shortcuts to Minesweeper, Solitaire, FreeCell, Spider Solitaire, Hearts and 3D Pinball – Space Cadet.
- The original XP cursors: the white arrow with the dark outline that XP shipped with. Mouse Properties (Control Panel → Printers and Other Hardware → Mouse) can switch to the Windows Black and 3D-White schemes. XP's own motion: a window flies to its taskbar button when minimised and grows back from it, menus and the Start menu fade in. All of it is dropped when reduced motion is asked for.
- Movable windows, resizable from every edge and corner, where dragging the left or top edge moves the window with it. Maximise, minimise, the taskbar, the Start menu and context menus.
- The taskbar: Quick Launch with Show Desktop, running windows, and a notification area with the clock, volume, network and Security Center. The « button opens the hidden icons.
- Volume: one click on the speaker opens the small slider above the taskbar, two open the Volume Control with the Master, Wave, SW Synth and CD Player channels, balance and mute. A double click on the clock opens the calendar the same way.
- When the taskbar runs out of room, one program's windows collapse into a single button ("4 Windows Explorer") from which a window can be picked, and the whole group closed at once. Every window has its window menu: on its taskbar button, on a right click on its title bar, on the icon in the title bar, and on Alt+Space.
- My Computer's full context menu: Open, Explore, Search, Manage, map network drive. Manage opens Computer Management: event log, shared folders, local users and groups, device manager, disk management and services — where the user list and the disk figures show the machine's real state.
- Right-clicking the taskbar: cascade and tile windows, minimise all, Task Manager and properties. Unlocked, the empty part of the taskbar can be dragged to any edge of the screen and resized by its inner edge; the place and the size survive a reload. The clock and Quick Launch can be hidden, the taskbar buttons have their window menus, and the start button has a menu of its own.
- Task Manager (Ctrl+Shift+Esc or Ctrl+Alt+Del): applications, processes, live CPU and network graphs, users. End task, switch to, new task, end process — a system process cannot be ended.
- Any program in the Start menu can be put on the desktop as a shortcut with a right click, with the little arrow in the corner. Files and folders get the same through "Send To ▸ Desktop (create shortcut)" and "Send To ▸ My Documents"; a shortcut wears its target's icon, and says so when what it points at is gone.
- Submenus that fly out: "Arrange Icons By ▸" and "New ▸" on the desktop, and folders in All Programs (Accessories ▸ with System Tools ▸ inside it, Games ▸), as in XP.
- Outlook Express: local folders with unread counts, a reading pane, writing, replying and forwarding, deleting and Send/Receive. Read, sent and deleted mail is kept.
- Internet Explorer: the old Google, keyword search across the local web, 20 built-in pages, the address bar, history, favourites that can be added and removed, a home page that can be set, and find on a page. Unknown addresses get a local error page. All six games can be started from `www.jatekbarlang.hu`.
- The local web: the Netkapu news portal with a poll, a PC magazine, the PC Bazár classifieds with a saved basket, the Netklub forum with posts that are kept, a mailbox with sample letters and a draft, city weather, and a searchable demonstration railway timetable. The wallpaper gallery sets the desktop background, the recipe page scales portions, and the HTML school previews the page you write.
- Notepad: a draft, saving documents, autosave, find, word wrap, and downloading the text file.
- The file manager: your own folders, documents, pictures, renaming, deleting, restoring, the Recycle Bin and searching for files. Four views from the View menu or the toolbar: Tiles, Icons, List and Details — the last with Name, Size, Type and Date Modified columns, sorted by clicking a header. The Folders button puts the folder tree where the task pane is, and the properties of Local Disk (C:) show the familiar pie of used and free space.
- A browsable, read-only C: drive: WINDOWS, Program Files, Documents and Settings, Temp and their subfolders. The DVD drive asks for a disc when clicked.
- Paint: pencil, brush, eraser, fill, line, rectangle, ellipse, text, colour picker, palette, undo, and saving or downloading a PNG.
- Calculator: the arithmetic, percent, square root, reciprocal, memory and the keyboard.
- Minesweeper: Beginner 9×9/10, Intermediate 16×16/40 and Expert 30×16/99, a custom board from 9–30 by 9–24, a safe first click, flag and question marks, chording with both buttons, the counter, the timer and best times.
- Klondike Solitaire: dragging cards and runs, click and double-click play, drawing one or three, the classic scoring, foundations, redealing, undo and auto-collect.
- FreeCell: the original numbered deals (game 617 is game 617 here too), dragging cards and legal runs, four free cells, auto-collect, undo and a win record.
- Spider Solitaire: dragging same-suit runs, one, two or four suits, ten columns, dealing from the stock, completed runs lifted off, and the original scoring that starts at 500.
- Hearts: three computer opponents, passing left, right and across, the two of clubs leading, the queen of spades at 13 points, shooting the moon, and a game to 100.
- 3D Pinball – Space Cadet: the original table, as a WebAssembly port running locally. Flippers, the plunger and nudging from the keyboard or on-screen buttons, the XP menu, pause, volume from the system setting, and high scores kept locally.
- Windows Media Player 9: the silver-and-blue skin with Microsoft's own transport buttons, a searchable library, a playlist, repeat, shuffle, two sound-driven visualisations, opening your own audio and video files, volume and mute.
- Display Properties: the original five tabs — Themes, Desktop, Screen Saver, Appearance, Settings. Wallpaper with its positions (stretch, center, tile), three colour schemes, and two working screen savers that start by themselves after the idle time given.
- System Properties: its own window with the General, Computer Name, Hardware, Advanced and Automatic Updates tabs. The computer name can be changed, and the automatic updates switch is the same one the Security Center shows.
- User Accounts: the account's name, picture and type. The name and the picture appear on the sign-in screen and in the Start menu.
- Sounds and Audio Devices Properties: volume, the sound scheme, and the sounds of system events, each one playable.
- Control Panel: the original category view with its ten categories, and the classic view with the fourteen separate settings beside it. Toolbar, address bar and the blue task pane, as in the file manager; the chosen view is remembered. The wallpaper, the colour scheme, the user name, the system sounds, the volume, the system information and the calendar are all reachable from here.
- Security Center: with the firewall, updates and virus protection panels that fold open. The firewall and automatic updates can be switched on and off, and their state is saved. It opens from the shield in the taskbar, from Control Panel, and with the `wscui` command.
- Command Prompt and Run. `help` lists the commands there are.

Icons on the desktop open on a double click. One tap is enough on a touch screen. F11 gives the real browser's full screen, and the desktop's context menu asks for it too.

## Saving, and working locally

The `windows-xp-simulator-v1` key in localStorage holds the documents, folders, pictures, drafts, settings, favourites and icon positions, the local web's basket, posts, vote and mail draft, the Media Player settings, and the Minesweeper, FreeCell and Space Cadet scores. Open windows and games in progress are not saved.

If local storage is unavailable or full, the program says so. Clearing the browser's data clears the saves with it. Documents and pictures that matter can be downloaded to the machine. Audio and video opened in Media Player are available only in that player window.

Everything needed to run is in the `assets` folder. The CSP forbids network calls, external resources and posting forms anywhere else; it allows an iframe only from this origin, which is how Space Cadet runs. Internet Explorer renders local content into the DOM — it does not load real web pages.

## The files

- `index.html`: the shell of the application and the loading screens.
- `styles.css`: the classic Luna interface and the programs.
- `caption-controls.css`, `tray-controls.css`, `scrollbar-controls.css`, `controls.css`:
  the parts of the interface drawn from the bitmaps in the original `luna.msstyles`.
  The classic theme does not use them.
- `js/core.js`: windows, menus, dialogs, saving, file operations.
- `js/internet.js`: Internet Explorer, the search engine and the local web.
- `js/web-pages.js` and `web-pages.css`: the interactive demonstration pages and what they save.
- `js/apps.js`: documents, Paint, Calculator, the command prompt.
- `js/explorer.js`: the file manager, the read-only system folders, the C: and D: drives.
- `js/utilities.js`: the settings and the rest of the tools.
- `js/player.js` and `player.css`: Windows Media Player 9, the library and the visualisations.
- `js/games.js`: Minesweeper and Solitaire.
- `js/cardgames.js` and `cardgames.css`: FreeCell, Spider Solitaire and Hearts. The rules are functions with no DOM in them, so whole deals can be tested.
- `js/pinball.js` and `pinball.css`: the Space Cadet window, its menu and its controls.
- `assets/pinball/`: the game's local WebAssembly bundle and the page that embeds it.
- `js/compmgmt.js` and `compmgmt.css`: Computer Management (My Computer's "Manage").
- `js/desktop-grid.js`: the icon grid, the places taken, and rearranging.
- `js/start.js`: the desktop, the Start menu and the session.
- `tools/luna/`: the scripts that extract the images from the Luna theme. Not needed to run
  the simulator — the extracted images are in the repository. See `tools/luna/README.md`.

## Where the pictures and sounds come from

The original XP images and sounds were downloaded; there is no generated stand-in wallpaper or icon anywhere. The source of each file is listed in `assets/sources.json`.

- [Windows XP `luna.msstyles`](https://github.com/robberphex/docker-wine-coolq/blob/master/luna.msstyles):
  the original Luna theme. The caption buttons, the arrow that opens the taskbar's hidden icons,
  the scrollbars and the common controls all come from it, in all three colour schemes, at their
  native size and without redrawing. Stretching follows the theme file's own `SizingMargins`.
  More was extracted than is used — the title bar and the frame, the Start button, the taskbar
  and the Start menu panels (`assets/frame/`, `assets/taskbar/`, `assets/start/`) — and kept in
  the repository so nobody has to extract them again. The `note` field in `sources.json` and the
  `NOTICE.md` files in those folders say which are in use.
- [Windows UI assets – bartekl1](https://github.com/bartekl1/windows-ui-assets): the original Windows XP wallpapers, sounds, cursors (.cur) and the Recycle Bin icon.
- [winXP – ShizukuIchi](https://github.com/ShizukuIchi/winXP): XP program icons, toolbar icons and Minesweeper pieces.
- [Google's old logo](https://www.google.com/intl/en_ALL/images/logo.gif).
- [JS Paint](https://github.com/1j01/jspaint): the classic Paint tool icons, as they looked.
- [Pranx's Bliss wallpaper](https://pranx.com/images/background.jpg): the 1920×1200 local copy (`bliss-hd.jpg`).
- [Azul](https://i.imgur.com/tLLKmd8.jpg) and [Autumn](https://4kwallpapers.com/nature/windows-xp-autumn-17201.html): local copies of ready-made 1920×1200 versions (`azul-1920.jpg`, `autumn-1920.jpg`), with no local resizing. Bliss is 1920×1200 as well. The blue Windows XP wallpaper with the logo is still the original 800×600 file.
- [XPIcons – Software History Society](https://github.com/softwarehistorysociety/XPIcons): the original icons for FreeCell, Spider Solitaire, Hearts, Show Desktop and the Security Center, at high resolution (Unlicense). These are 1024 × 1024 files that the browser scales down.
- [3DPinballSpaceCadet – lrusso](https://github.com/lrusso/3DPinballSpaceCadet): the browser WebAssembly bundle of Space Cadet, from the MIT-licensed engines by [alula](https://github.com/alula/SpaceCadetPinball) and [k4zmu2a](https://github.com/k4zmu2a/SpaceCadetPinball); the game's icon comes from there too. See `assets/pinball/NOTICE.md`.
- [Microsoft's WMP 9 Series default skin](https://archive.org/download/windowsmediaplayerskinscollection/9SeriesDefault.wmz): the original control graphics, used unaltered. See `assets/wmp9/NOTICE.md`.

Windows XP, its icons and its sounds belong to Microsoft; the Bliss photograph is Charles O'Rear's and Microsoft's, and the Google logo is Google's. Space Cadet and its images and sounds belong to Cinematronics, Maxis and Microsoft; the engine's MIT licence does not cover them. The source projects do not transfer anyone else's trademarks or copyright. This is an independent nostalgic demonstration, and the code is its own implementation.

Every asset is in the repository, so nothing has to be downloaded to run the simulator. `assets/sources.json` says line by line where each file came from and how large it is; where a downloaded image was altered afterwards (the account pictures from BMP, a few icons scaled down from 1024 pixels, the right edge of the Start button redrawn), the entry's `note` field says so.

## Checking it

`node --test tests/*.test.mjs`

The 115 automated tests cover saving documents and settings, the file operations, the icon grid, resizing windows and the taskbar, starting up and the sound handling, the rules of the card games, Minesweeper's board sizes, Pinball's pausing and focus, the assets and the CSP. They also check every local page's images and internal links, the basket and the guest book being saved, HTML escaping, and Media Player's playback order.

Loading takes 5.5 seconds, after which the sign-in screen waits: the desktop always opens by clicking the name, and then two seconds of welcome follow. That click is also the gesture a browser waits for before it will play sound. If sound is refused anyway, the screen stays at sign-in and the next click tries again.

Checked in a browser: dragging all eight window edges and corners, maximising and restoring; reactivating Pinball from another window, from the controls below it and after closing its help; Media Player playback and library search; the local web pages, the basket, a post and a mail draft, and all of those surviving a reload.
