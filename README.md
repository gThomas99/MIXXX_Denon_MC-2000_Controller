<p align="center"> MIXXX DJ controller for Denon MC2000.
    <br> 
</p>

## 📝 Table of Contents

- [About](#about)
- [Installation](#Installation)
- [Usage](#usage)
- [Configuration](#configuration-options)
- [Coding Notes](#coding_notes)
- [Todos](#todos)
- [Authors](#authors)
- [Acknowledgments](#acknowledgement)

## 🧐 About <a name = "about"></a>

# MIXXX DJ controller for Denon MC2000. 

The Denon MC2000 was marketed as an entry level two deck controller for Serato DJ, the original package came with Serato DJ Intro (now DJ Lite). This project is a Midi mapping and script that allows the Denon MC2000 to be used with MIXXX open source DJ software: this will allow access to more professional features. The controller's features and layout are relatively conventional, this mapping aims to follow the original Serato DJ Intro functions but have added options for alternate builds. In most cases you should be able to use the controller on MIXXX by following Denon MC2000 manual. 

The controller was released in 2012 but is no longer available: Denon DJ was acquired by inMusic Brands in 2014 and Denon MC range was phased out. It has not received a lot of attention recently: the user created MIXXX mappings for this controller are old and I couldn't get a lot of commands to work as expected on newer versions of MIXXX. (MIXXX does not produce an official mapping for Denon MC2000). 

This controller was developed near enough from scratch on MIXXX version 2.5.3 on a Windows platform. Extensive use is made of components.js framework. This does mean the mapping is JavaScript heavy and rather verbose.  

Only `Denon-MC2000.midi.xml`, `Denon-MC2000-scripts.js` are required by MIXXX, the other files are designed primarily for internal use.

- mixx-debaug.bat is a Windows batch file for starting MIXXX in debug mode. This will display the debug messages embedded in the script as well as midi signals and MIXXX messages
- Denon-MC2000-MIDI-mapping.csv summaries all the midi code mappings. The first two columns link to pages 17 to 19 in Denon Manual explaining the intended function of each button
- scripts, ai generated python scripts to manage csv mapping file, experimental.
- util/create-m3u.ps1 creates m3u play list from a directory structure: reads first level directories and then creates playlist from all music file, search is recursive. (Windows Powershell script)


## 🏁 Installation <a name = "Installation"></a>

# Installing Custom Controller Mapping for Mixxx

This section explains how to install the Denon MC2000 controller mapping for Mixxx. 
## Prerequisites
- Mixxx DJ software installed ([Download Mixxx](https://mixxx.org/download/))
- Denon MC2000 controller hardware
- Mapping files: `Denon-MC2000.midi.xml`, `Denon-MC2000-scripts.js`, 

Required libraries (e.g., `lodash.mixxx.js`, `midi-components-0.0.js`) should already be installed with MIXXX.

## Controller Directories

### User Controllers Directory
- **Windows:** `%LOCALAPPDATA%\Mixxx\controllers\`
- **macOS:** `~/Library/Application Support/Mixxx/controllers/`
- **Linux:** `~/.mixxx/controllers/`

### Official Mixxx Controllers Directory (system-wide)
- **Windows:** `C:\Program Files\Mixxx\controllers\`
- **macOS:** `/Applications/Mixxx.app/Contents/Resources/controllers/`
- **Linux:** `/usr/share/mixxx/controllers/`

> You can install custom mappings in your user directory or place them in the official Mixxx controllers directory for system-wide access. User directory is recommended for custom or experimental mappings but will only be available that user.

---

## Installation Steps

### 1. Copy Mapping Files
Place the following files in your Mixxx controllers directory:
- `Denon-MC2000.midi.xml`
- `Denon-MC2000-scripts.js`
- `lodash.mixxx.js` (if required)
- `midi-components-0.0.js` (if required)

### 2. Start or Restart Mixxx
- Launch Mixxx.
- If Mixxx is already running, go to **Preferences > Controllers** and click **Rescan** or **Reload** to detect new mappings.

### 3. Enable the Controller
- In **Preferences > Controllers**, select **Denon MC2000** from the list.
- Ensure the controller is enabled (checkbox checked).
- If needed, assign the mapping manually by selecting the correct XML file.


---

## 🏁 Usage <a name = "Usage"></a>

Summary of implemented controls. Denon-MC2000-MIDI-mappings.csv is a table showing all the command implemented and their midi-mapping.

On startup all the lights on controller are turned on for a second to show successful initialization. If the required libraries are missing the 'VINYL MODE' lights will blink and then turn off: this is a fatal error and controller will not operate. Volumes and other pots are set to safe levels, move any slider or knob to get MIXXX to register the actual level on the controller. Key Lock LED flash tio indicate pitch range.

## Deck Controls

- **Play/Pause**: Standard transport controls for each deck.
- **Cue**: Sets or returns to the cue point.
- **Jog Wheel**: Scratches (VINYL mode) or nudges (CDJ mode) the track. Touch-sensitive for scratch mode.
- **Pitch Fader**: Adjusts playback speed.
- **Sync**: Matches BPM and phase to the opposite deck. Short press one-off sync, long press for sync lock
- **Shift Layer**: Hold `Shift` to access secondary functions (e.g., alternate hotcues, sampler controls). <SHIFT> + pfl <CUE> to enable/disable shift lock
- **Key Lock**: Enable harmonic matching. <SHIFT> cycle through pitch ranges: 6% 8% 12% 50%. Key lock LED flashes
- **Jog Wheel**: Scratching in vinyl mode, pitch bend in CDJ mode. VINYL MODE button to set mode

Moving pitch fader after a one-off Sync will return BPM to original value.

## Monitor
- **cue**: output track to head phone (cue button next to SHIFT)
- **Phones Knob**: Headphone volume
- **Cue/Master Pan**: Headphone balance between headphone monitor and master output

MIXXX gui has Split button this will separate monitor and master channel, one side of the headphone will only play monitor and the other side master output

## Mixer Section

- **Channel Faders**: Adjust volume for each deck.
- **Crossfader**: Blend between decks.
- **EQ Knobs**: Control High, Mid, and Low frequencies for each deck
- **Gain**: Adjust input gain per channel.
- **Master Level**: Master output level

## Effects

Two effects units that can be enabled/disabled for any deck: mapping can only be managed through GUI, there are no controller functions to manage mapping. The default setting is to enable FX1 to deck 1 and FX2 to deck 2. Each effect unit can load up to 3 effects in a chain. These effects are processed one after the other in series.

- **FX Buttons**: Start stop effect.
- **FX Knobs**: Control effect parameters.
- **Dry/Wet**: Master control for effects unit. 

BEATS/SAMPLE VOL encoder knob is used for Dry/Wet mix, this function differs from Serato implementation. Shift features on this control are used for Sample pre-gain see next section

- **BPM Tap**: pressing BEATS/SAMPLE VOL runs bpm tap button script

## Samplers
Samplers are miniature decks. They allow you to play short samples and jingles or additional tracks in your mix. The controller manages eight sample units split in to two deck groups.

Denon MC2000 does not have dedicated sample pads: hotcue buttons double as sample and this is controlled by SAMPLE MODE button.

- **Sample/Hotcue Mode Button**: toggles between Hotcue and Sample. Light on in Sample mode
- **Hotcue/Sample Button**: 4 x buttons per deck. Set/Play from hotcue, Play/Stop samples. <Shift> to clear Hotcue/Sample

Sample pre-gain is managed by shift functions  of BEATS button/encoder.  The controller keeps track of the current sampler through a focus mechanism.

- **Sample pregain**: <Shift> and turn BEATS encoder to set pre-gail on the focussed sampler
- **Sample focus**: <Shift> and press BEATS to increment the sample focus, sample light will indicate new focus

## Library & Navigation

- **Browse Encoder**: Scroll through library tracks.
- **Load Buttons**: Load selected track to Deck 1 or Deck 2.
- **Preview Button**: <BROWSE1> button to Start/Stop track in preview deck.

## LEDs & Feedback

- **LED Feedback**: Visual feedback for active states, cue points, sync, hotcues/samples  and effects. This is managed by controller script, the Denon MC2000 does not work with Midi output generated by MIXXX. 
- **Custom LED Protocol**: Initializations, one-off sync and sample focus.


## Troubleshooting
- If the controller is not detected, ensure the USB cable is connected and the device is powered on.
- If controls do not work, verify the mapping files are in the correct directory and the correct mapping is selected in Mixxx.
- For advanced debugging, enable debug mode in the JS file and check the Mixxx log output.

## More Help
- Mixxx Manual: [https://mixxx.org/manual/latest/](https://mixxx.org/manual/latest/)
- Mixxx Community Forums: [https://mixxx.discourse.group/](https://mixxx.discourse.group/)
- Mixxx Controller Mapping Guide: [https://mixxx.org/manual/latest/chapters/controller_mapping.html](https://mixxx.org/manual/latest/chapters/controller_mapping.html)

---
## :alarm_clock: Todos <a name = "todos"></a>

- Test functions
- Test on Linux (I do not have a Mac)
- Clean up debug output.

---

## :computer: Configuration Options <a name = "configuration-options">"</a>

The `MC2000Config` object at the top of the script controls build-time behavior and allows for some alternate mappings. 

### Configuration Options

#### `useAltPitchBend` (boolean, default: `true`)
Controls the pitch bend behavior for the jog wheel.

- **`true`**: Uses alternate `<SHIFT>` pitch bend buttons with jump 32 behavior
- **`false`**: Uses standard forward/back behavior

**Use case**: Enable for more responsive pitch control with larger jumps. Disable for traditional forward/back shuttle behavior.

#### `useAltPlayShift` (boolean, default: `false`)
Controls the shift modifier behavior for the play button.

- **`true`**: Uses alternate play shift method (reverse roll)
- **`false`**: Uses standard stutter play shift behavior

**Use case**: Enable for experimental reverse-roll functionality when shift is held during play. Disable for standard shift-play behavior.

#### `pregainAsFilter` (boolean, default: `true`)
Determines the function of the pregain knob.

- **`true`**: Uses pregain knob as a filter control
- **`false`**: Uses pregain knob for standard gain adjustment

**Use case**: Enable if you prefer filter control on the pregain knob. Disable for traditional pregain volume control.

#### `setVolumeToSafeDefault` (boolean, default: `true`)
Controls automatic volume initialization on script load.

- **`true`**: Sets mixer and master volumes to safe default levels during initialization
- **`false`**: Preserves existing volume levels from previous session

**Use case**: Enable for safer operation (prevents unexpected loud playback). Disable to preserve user-configured levels between sessions.

## Jog Wheel Tuning Constants
After config object is a set of user configurable parameter for the jog wheels.

These constants control the behavior and sensitivity of the jog wheel scratching and pitch bend functionality.

### Scratch Resolution

#### `jogResolution` (number, default: `125`)
Ticks per revolution for jog wheel resolution.

- **Higher values** (e.g., 192): Reduce scratch sensitivity, allowing finer control
- **Lower values** (e.g., 96): Increase scratch sensitivity for faster scratching

**Tuning tip**: Increase from 125 to 192 to halve scratch sensitivity again.

#### `jogRpm` (float, default: `33⅓`)
Virtual vinyl RPM force applied to the jog wheel simulation.

Controls the "weight" and inertia of the virtual vinyl record. Standard vinyl spins at 33⅓ RPM.

### Scratch Dynamics

#### `jogAlpha` (float, default: `1.0/16` = `0.0625`)
Inertia coefficient for jog wheel scratch behavior.

- **Lower values** (e.g., 1/32): More inertia, harder to keep spinning
- **Higher values** (e.g., 1/8): Less inertia, easier to spin freely

**Tuning**: Set to 1/16 for "heavier" vinyl feel with more inertia.

#### `jogBeta` (float, default: `(1.0/16)/64` = `0.0009765625`)
Damping coefficient that controls how quickly the jog wheel stops spinning.

- **Lower values**: Less damping, longer spin-down time
- **Higher values**: More damping, quicker stop

**Formula**: Typically set to `jogAlpha / 64` for consistent behavior.

**Tuning tip**: Increase damping to reduce drifting and creeping when scratching.

#### `jogEnableSlipOnScratch` (boolean, default: `false`)
Enables slip mode display during scratching.

- **`true`**: Track position stays fixed while jog wheel moves (vinyl slip effect)
- **`false`**: Jog wheel position controls track position

**Use case**: Enable for authentic DJ slip effect in the Mixxx display. Disable for simpler, predictable jog behavior.

### Pitch Bend & Boost

#### `jogPitchScale` (float, default: `1.0/4` = `0.25`)
Scaling factor for pitch bend when not scratching (CDJ mode, outer wheel).

Controls the sensitivity of pitch adjustment when using the jog wheel for pitch bending rather than scratching.

- **Higher values** (e.g., 0.5): More responsive pitch bending
- **Lower values** (e.g., 0.1): More subtle pitch control

#### `jogMaxScaling` (float, default: `1.25`)
Boost multiplier for fast jog wheel spins.

- **`1.0`**: No boost, linear response
- **`1.25`**: Slight boost for quick spins (default, recommended)
- **`2.0` or higher**: Aggressive boost for very responsive fast spins

**Use case**: Increase for faster pitch adjustment during quick wheel movements. Keep at 1.0 if you prefer consistent, predictable scaling.

#### `jogCenter` (hex, default: `0x40`)
MIDI center value for the relative encoder.

This is the neutral/zero point for relative encoder messages. Standard MIDI relative encoders use 0x40 (64 in decimal) as center.

**Only change if your specific hardware uses a different center point.**

### Shift Mode / Fast Search

#### `jogScrubScaling` (float, default: `0.01`)
Scaling factor for fine playposition adjustment when shift is held (fast search mode).

Controls how much the track position advances per jog wheel tick in shift mode. The playposition value ranges from 0 to 1 (start to end of track).

- **`0.01`**: Default (1% per tick) - precise control for accurate seeking
- **`0.005`**: Half as sensitive (0.5% per tick) - pixel-level precision
- **`0.02`**: 2x faster (2% per tick) - balanced seeking
- **`0.05`**: 5x faster (5% per tick) - rapid track navigation

**Use case**: Decrease for pixel-level precision when searching for specific cue points. Increase for faster track navigation when holding shift.

**Example**: At default 0.01, turning the jog wheel 10 times while holding shift = 10% track position (0.1).

## Internal State Variables

These variables track runtime state. Apart from pitch ranges these should not be changed.

#### `MC2000.pitchRanges` (array, default: `[0.06, 0.08, 0.12, 0.50]`)
Pitch range multipliers for keylock and pitch controls across 4 sensitivity levels.

#### `MC2000.shiftHeld` (boolean, default: `false`)
Runtime state: `true` when shift button is currently held down.

#### `MC2000.shiftLock` (boolean, default: `false`)
Runtime state: `true` when shift lock (sticky shift) is enabled.

#### `MC2000.sampleMode` (object)
Per-deck sample mode state: `{"[Channel1]": false, "[Channel2]": false}`

## LED Configuration

#### `MC2000.numHotcues` (number, default: `8`)
Number of hotcue buttons per deck.

Controls how many hotcue LED indicators are active (1-8).

#### `MC2000.leds` (object)
Mapping of LED symbolic names to MIDI control codes.

**Common LED names**:
- Transport: `play`, `cue`, `sync`, `keylock`
- Hotcues: `cue1`, `cue2`, `cue3`, `cue4`
- Loops: `loopin`, `loopout`, `autoloop`
- Effects: `fx1_1`, `fx1_2`, `fx1_3`, `fx2_1`, `fx2_2`, `fx2_3`
- Samplers: `sampler1`–`sampler8`
- Modes: `vinylmode`, `shiftlock`, `samplemode`
- Monitor: `monitorcue_l`, `monitorcue_r`

**Caution**: Only modify these values if you've confirmed your hardware uses different MIDI codes.

## Performance & Caching

#### `MC2000.LedManager` (LED State Manager)
Provides a cache-aware API for LED control that minimizes redundant MIDI traffic.

- **Automatic caching**: Only sends MIDI updates when state actually changes
- **Bulk operations**: Use `bulk()` method to update multiple LEDs efficiently
- **State reflection**: Use `reflect()` to sync LEDs with Mixxx engine values

## Debug Mode

#### `MC2000.debugMode` (boolean, default: `false`)
Enables detailed console logging for troubleshooting.

Set to `true` to see `[MC2000-DEBUG]` messages in the Mixxx console. Useful for:
- Tracking MIDI message flow
- Debugging LED state changes
- Monitoring shift layer transitions
- Identifying unhandled controller events

## Quick-Start Configuration Examples

### Denon mapping
```javascript
var MC2000Config = {
    useAltPitchBend: false,
    useAltPlayShift: false,
    pregainAsFilter: false,
    setVolumeToSafeDefault: true,
};
```

### ALternaate mapping
```javascript
var MC2000Config = {
    useAltPitchBend: true,
    useAltPlayShift: true,
    pregainAsFilter: true,
    setVolumeToSafeDefault: true,
};
```

### Responsive Scratching
```javascript
MC2000.jogResolution = 192;    // Finer control
MC2000.jogAlpha = 1.0/32;      // Heavier feel
MC2000.jogBeta = (1.0/32)/64;  // More damping
MC2000.jogMaxScaling = 2.0;    // Aggressive boost
```

### Smooth Vinyl Simulation
```javascript
MC2000.jogEnableSlipOnScratch = true;
MC2000.jogAlpha = 1.0/16;
MC2000.jogBeta = (1.0/16)/64;
MC2000.jogMaxScaling = 1.25;
```

## Troubleshooting

**Scratching feels too sensitive**
- Increase `jogResolution` (e.g., 192)
- Increase `jogAlpha` denominator (e.g., 1/32)

**Scratching feels sluggish**
- Decrease `jogResolution` (e.g., 96)
- Decrease `jogAlpha` denominator (e.g., 1/8)

**Jog wheel drifts/creeps**
- Increase `jogBeta` (more damping)
- Ensure `jogBeta = jogAlpha / 64` relationship is maintained

**LED updates are slow or stuttering**
- Enable `MC2000.debugMode = true` to check for excessive MIDI traffic
- Verify LED Manager caching is working (should see cache hits in logs)

**Shift layer not responding**
- Check `MC2000.shiftHeld` state in console
- Enable debug mode to trace shift button MIDI messages

## Modification Workflow

1. **Edit the config** in `Denon-MC2000-scripts.js` (lines ~54-59)
2. **Save the file**
3. **Reload controller mapping** in Mixxx: Preferences → Controllers → Reload XML Mapping
4. **Enable debug mode** if needed: Uncomment/set `MC2000.debugMode = true`
5. **Check Mixxx console** for `[MC2000-DEBUG]` output
6. **Adjust values** iteratively until desired behavior is achieved
   
## ⛏️ Coding Notes <a name = "coding_notes"></a>

This section assumes familarity with Mixxx's documention of user defined controller mappings.

Mixxx provides three general patterns for coding controllers.

- **Direct Midi Mapping**: this is the simplest option, built in scripts are used to map commands dirctly and no further scripting is required. 
- **User Defined JavaScript functions**: Controls are mapped to a function in a user defined Javascript file: a javascript object is defined in the file which acts the namespace for the controller and functions are added as required to handle various midi codes. The javascript file and object name space are set in midi mapping xml file. 
- **ComponentsJS**:  JavaScript on steriods. ComponentsJS is library of objects used in the JavaScript file described above that abstracts the controller components into buttons, pots, encoders and other object classes. The component object are placed in groups objects to create a deck, FX unit and other logical units. 


A controller can use any combination of the patterns described above. I have used the ComponentsJS extensively, although  this is the mode complex method it makes it easier to implement shift mappings and deal with some of the quirks on Denon MC2000. Effectively the controller is an adapter pattern as it converts midi inputs to Mixxx engine command.

JogWheel are problematic as they require a Javascript mapping, there is no direct control. Initially I found this very confusing and judging from forum comments this is a common problem. Much of the confusion in my opinion is due to lack of a clear explanation. The Denon MC2000 uses a standard capacative encoder jogwheel: it should be thought of as two controls a toggle button and an encoder. When you touch the top of the wheel it acts as button to enable  scratch mode and then switch to jog mode when when you stop touching the top of the wheel: this is hanled by wheelTouch function in the controller code. When you turn the wheel it will send 'ticks' to show the wheel is being turned in clockwise or anticlockwise direction, the value of the 'tick' also increases with the movement speed: the wheelTurn button then sends the ticks to either the Mixxx scratch or jog scratch control detirmined by whether the the top of the wheel is being touched. This the  expected behaviour of 'vinyl mode' jog wheel: turning on the side runs jog mode while turning on the top runs scratch mode.

The Denon MC2000 also does some internal handling for jog wheels depending on whether the 'vinyl mode' is enabled. In vinyl mode different sets on midi codes are sent depending on whether the wheel is turned on the side or top, both midi codes are sent to inputWheel function which has internal logic to send to either the scratch or jog control. This also means the 'vinyl mode' button on the controller is there to enable or disabled the jog wheel button: disabling 'vinyl mode' means all wheel turns are sent as jog wheel midi codes and no button codes are sent when touching the top of the wheel.

However this does not explain why a Javascript function is required for the jog wheels as the above behaviour could be implemented by direct engine controls. The main reason why a javascript function is required is due to how the controller sends movement 'ticks': some controllers send negative and positive numbers to show clockwise or anti clockwise movement while others always send postive numbers with turn direction detirmined by subtracting a center value: this logic although simple has to be implemented in JavaScript to then send the correct value to Mixxx. The MC2000 takes the later apporoach with clockwise and anti-clockwise rotations detected around a center value of 0x40.

The jog wheels is implemented as jogwheel componentJS and inputWheel and inputTouch functions are re-implemented. The 'vinyl mode' button is mapped to input fuction but only records internal state as the functionality is handled directly winget install Python.Python.3.12by Denon controller.

The Denon MC2000 controller also has a number of idiosyncrasies that make it difficult to code and resulted in the extensive use of component objects

- Different midi codes are sent when a key is pressed (midi note on) and released (midi note off). This means all buttons are handled by javaScript components to deal with this and each button has two xml entries to call the same code

- LEDS have a different set of midi codes and do not respond to Mixxx standard output (reception) calls. LED control is managed by the output function of the component which makes calls to an LED api that deal with the internal LED logic. 

- Some midi codes do not follow an expected pattern. The main example is the Sample buttons which have a non-sequential order making it difficult to use standard array logic. This was resolved by creating wrapper function to a component call: The midi mapping calls a standard javaScript function that then works out the component method to call.

It took me two attempts to write this controller. On the first attempt I was struggling to understand the different coding patterns and the peculiarities of Denon MC2000: it was just a mess. On the second attempt I used ai coding tools, prompting  'write a mixxx controller for Denon MC2000' (ok it was a little bit more specific) resulted in a workable skeleton and rapid development of the rest of the controller. One result of this approach was the use of wrapper functions, the initial skeletons lifted code from other Denon controller and the ai was then coaxed to use the components library. (The wrapper functions are at the end of the controller code). Although the use of wrapper handler functions are open to debate and serve no real value I have kept them in on the basis 'if it ain't broke don't fix it'.

- [MIXXX mapping Controls](https://manual.mixxx.org/2.5/en/chapters/appendix/mixxx_controls)
- [MIXXX Midi scripting wiki](https://github.com/mixxxdj/mixxx/wiki/Midi-Scripting)
- [Components.js](https://github.com/mixxxdj/mixxx/wiki/Components-JS) - Midi object abstraction layer
- [JogWHeel Script]( https://github.com/gold-alex/)


## ✍️ Author<a name = "authors"></a>

- [@gthomas99](https://github.com/gThomas99) - One day I may learn to DJ instead of writing controllers

## 🎉 Acknowledgements and References<a name = "acknowledgement"></a>

- [Denon Support]( https://www.denondj.com/downloads.html#legacy) legacy product
- [Serato MC2000 page]( https://serato.com/dj/hardware/denon-dj-mc2000)
- [Picheto's Mapping on MIXXX forum](https://mixxx.discourse.group/t/denon-mc2000-controller-midi-mapping-and-script/14103)
- [JogWHeel Script](https://github.com/gold-alex/Rotary-Encoder-Jogwheel-Mixxx)


