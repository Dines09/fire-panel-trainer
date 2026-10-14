# Fire Panel Trainer

A hands-on web simulator of the **Consilium Salwico Control Panel M 4.3** (Salwico Cargo addressable fire detection system), so that operators can practise on it without touching the real panel.

It works on a phone (upright or sideways), a tablet and a laptop.

## Open it

- **On your phone or any browser:** https://dines09.github.io/fire-panel-trainer/
- **Simplest:** double-click `dist/index.html`. No internet and no server needed.
- **As an installable app (PWA):** put the contents of `dist/` on any web host (for example GitHub Pages). On Android tap **⤓ Install**; on iPhone use Share → *Add to Home Screen*. After the first visit it works offline.

## What you can practise

| Lesson | What it teaches |
|---|---|
| Know the panel | Lamps, keys, Status, Menu, ESC, dimmer |
| Log in | Access level 2B with code **2222** (level 3: **3333**); the panel also asks for the code by itself when something needs it |
| Fire alarm: mute and reset | MUTE without login only silences the buzzer; log in, MUTE, details, RESET |
| Manual call point | RESET fails until the call point itself is reset |
| Several fire alarms | MULTIPLE ALARMS, first and last alarm always shown, Reset All |
| Disable a detector | Menu » 3 » 1 » 2: zone, type, address, permanent; Disablements lamp stays lit |
| Reconnect a detector | Disablement list and RESET; lamp goes off |
| Disable a zone for a set time | Timer disablement; call points stay in service |
| Fault | Fault code, MUTE, find the cause, RESET |
| Detector test | Zone test mode: pick the zone from the list, then Abort (◄) or Confirm (OK); alarms shown and logged, no bells |
| Lamp and display test | Menu » 5 » 4 |

**Learning mode** shows each step and highlights the key to press. **Free practice** gives no guidance: use the **Ship** box to start smoke at any detector, break a call point, remove a detector or cause a central fault, then handle it on the panel.

Also working: pre-alarms, warnings, Resound, the alarm delay (time 1 to mute, time 2 to reset), disabling bells / external controls / alarm transfer / alarm delay, clock disablements, old disablements (0 = reactivate), remove all, disabling a detector from the fire list (0), history lists, set time / date / dimmer / key beep, automatic log-out after 30 minutes.

**Panel memory:** in free practice the panel keeps its disablements, settings and history when the app is closed, like the real one. *Help → Clear panel memory* empties it.

## Controls

- **Phone / tablet:** tap the keys.
- **Keyboard:** `0-9`, `Enter`, `Backspace` (erase), arrows, `Esc`, `M` Menu, `S` Status, `Q` Mute, `R` Reset, `A` Multiple alarms, `F` Fire, `T` Fault, `D` Disablements, `+` / `-` day / night.

## The sample ship

15 zones on 3 loops (152 loop units). The location texts come from a tanker's address list; **the detector types are made up for training**. One detector in alarm starts the alarm delay (2 minutes) before the bells ring; a call point or a second alarm rings them at once. Your own ship is programmed differently: check its address list and cause/effect plan.

Not included: periodic disablements, printing, USB functions and the service menu (access level 4).

## Change it

Built with React and Tailwind CSS. Node.js is needed only to rebuild.

```
npm install
npm run dev      # http://localhost:8080, rebuilds when a file changes
npm run build    # writes dist/
npm test         # panel logic, and a walk through every lesson
```

To put a new version on the web page: `npm run build`, commit (the built `dist/` folder is part of the repository), `git push`, then `npm run deploy`. The page is served from the `gh-pages` branch, which holds only the contents of `dist/`.

| File | What is in it |
|---|---|
| `src/panel/engine.js` | The panel's logic: keys, alarms, access levels, menus, disablements. No drawing. |
| `src/panel/site.js` | Zones, addresses and location texts. Edit this to match your ship. |
| `src/panel/faults.js` | Fault codes, causes and remedies. |
| `src/lessons.js` | The lessons, step by step. |
| `src/ui/` | Faceplate, display and the side boxes. |
| `src/audio.js` | Buzzer and bells. |

## Sources and disclaimer

Screens, key functions, the menu tree, access levels and fault codes follow the *Salwico Cargo Addressable Fire Detection System User Guide* (Consilium, document 5100332-01A01, April 2010). Faceplate colours and key positions follow Consilium's product picture of the Control/Repeater M 4.3 Cargo. Where the guide does not show a screen (home screen, entry screens, questions), the layout here is an approximation.

Developed by ETO.

This is an unofficial training aid. It is not affiliated with or endorsed by Consilium, and product names are trademarks of their owners. Always follow the official manual and your company's SMS on board.
