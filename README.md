<p align="center"> MIXXX DJ controller for Denon MC2000.
    <br> 
</p>

## 📝 Table of Contents

- [About](#about)
- [Installation](#Installation)
- [Usage](#usage)
- [Coding Notes](#coding_notes)
- [Todos](#todos)
- [Authors](#authors)
- [Acknowledgments](#acknowledgement)

## 🧐 About <a name = "about"></a>

# MIXXX DJ controller for Denon MC2000. 

The Denon MC2000 was marketed as an entry level two deck controller for Serato DJ, the original package came with Serato DJ Lite. This project is a Midi mapping and script that allows the Denon MC2000 to be used with MIXXX open source DJ software: this will allow access to more professional features. The controller's features and layout are relatively conventional and basic, this mapping aims to follow the original Serato DJ Lite functions. In most cases you should be able to use the controller on MIXXX by following Denon MC2000 manual. 

The controller was released in 2012 but is no longer availble new in UK. It has not received a lot of attention recently: the user created MIXXX mappings for this controller are old and I couldn't get a lot of commands to work as expected on newer versions of MIXXX. (MIXXX does not produce an official mapping for Denon MC2000)

This controller was developed near enough from scratch on MIXXX version 2.5 on a Windows platform. Extensive use is made of components.js framework with all mappings except jogWheel/JogTouch working through a component object: this was done more for consistency than efficiency. This does mean mapping is JavaScript heavy and rather verbose. The JogWheel script was lifted from  [Gold-Alex]( https://github.com/gold-alex/)
Rotary-Encoder-Jogwheel-Mixxx: this seemed to offer better control compared to standadrd offering but is an area that can be improved. (I suspect a lot of people have problems understating how JogWheels are scripted in MIXXX). 

Only `Denon-MC2000.midi.xml`, `Denon-MC2000-scripts.js` are required by MIXXX, the other files are designed primarily for internal use.

- mixx-debaug.bat is a Windows batch file for starting MIXXX in debug mode. This will display the debug messages embeded in the script as well as midi signals and MIXXX mesages
- Denon-MC2000-MIDI-mapping.csv summarises all the midi code mapings. The first two columns link to pages 17 to 19 in Denon Manual explaining the intended function of each button
- Denon-MC2000-README.md is AI generated documentation detailing the project status


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

On startup all the lights on controller are turned on for a second to show successful initialisation. If the required libraries are missing the 'VINYL MODE' lights will blink and then turn off: this is a fatal error and controller will not operate.

---

## 🏁 Usage <a name = "Usage"></a>

Summary of implemented controls.

## Deck Controls

- **Play/Pause**: Standard transport controls for each deck.
- **Cue**: Sets or returns to the cue point.
- **Jog Wheel**: Scratches (VINYL mode) or nudges (CDJ mode) the track. Touch-sensitive for scratch mode.
- **Pitch Fader**: Adjusts playback speed. <SHIFT> + <KEY LOCK> cycles through pitch ranges
- **Sync**: Matches BPM and phase to the opposite deck. Short press one-off sync, long press for sync lock
- **Shift Layer**: Hold `Shift` to access secondary functions (e.g., alternate hotcues, sampler controls). <SHIFT> + pfl <CUE> to enable/disable shift lock

Moving pitch fader after a one-off Sync will return BPM to original value.

## Monitor
- **cue**: output track to head phone (cue button next to SHIFT)
- **Phones Knob**: Headphone volume
- **Cue/Master Pan**: Headphone balance between headphone monitor and master output

MIXXX Gui has Split button this will seperate monitor and master channel, one side of the headphone will only play monitor and the other side master output

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

Denon MC2000 is an entry level deck and does not have dedicated sample controls: hotcue buttons double as sample and this is controlled by SAMPLE MODE button.

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
- **Custom LED Protocol**: Initialisation, one-off sync and sample focus.


## Troubleshooting
- If the controller is not detected, ensure the USB cable is connected and the device is powered on.
- If controls do not work, verify the mapping files are in the correct directory and the correct mapping is selected in Mixxx.
- For advanced debugging, enable debug mode in the JS file and check the Mixxx log output.

## More Help
- Mixxx Manual: [https://mixxx.org/manual/latest/](https://mixxx.org/manual/latest/)
- Mixxx Community Forums: [https://mixxx.discourse.group/](https://mixxx.discourse.group/)
- Mixxx Controller Mapping Guide: [https://mixxx.org/manual/latest/chapters/controller_mapping.html](https://mixxx.org/manual/latest/chapters/controller_mapping.html)

---
## Todos <a name = "todos"></a>

Test functions
Clean up debug output.

---

## ⛏️ Coding Notes <a name = "coding_notes"></a>

This section assumes familarity with MIXXX'x documention of user defined controller mappings.

MIXXX provides three general patterns for coding controllers.

- **Direct Midi Mapping**: this is the implest option, built in scripts are used to map commands dirctly and no further scripting is required. 
- **User Defined JavaScript functions**: Controls are mapped to a function in a user defined Javascript file: a javascrip object is defined in the file which acts the namespace for the controller and functions are added as required to handle various midi codes. The javascript file and object name space are set in midi mapping xml file
- **ComponentsJS**:  JavaScript on steriods. ComponentsJS is library of objects used in the JavaScript file described above that abstracts the controller components into buttons, pots, encoders and other object classes. The component object are placed in groups objects to create a deck, FX unit and other logical units. 

A controller can use any combination of the patterns described above. JogWheel are problematic as there is no simple direct mapping type due to the different types of hardware and require a script to work.

The Denon MC2000 controller also has a number of idiosyncrasies that make it difficult to code and resulted in the extensive use of component objects

- Different midi codes are sent when a key is pressed (midi note on) and released (midi note off). This means all buttons are handled by javaScript components to deal with this and each button has two xml entries to call the same code

- LEDS have a different set of midi codes and do not respond to MIXXX standard output (reception) calls. LED control is managed by the output function of the component which makes calls to an LED api that deal with the internal LED logic. 

- Some midi codes do not follow an expected pattern. The main example is the Sample buttons which have a non-sequential order making it difficult to use standard array logic. This was resolved by creating wrapper function to a component call: The midi mapping calls a standard javaScript function that then works out the component method to call.

It took me two attempts to write this controller. On the first attempt I was struggling to understand the differnt coding patterns and the peculiarties of Denon MC2000: it was just a mess. On the second attempt I used ai coding tools, prompting  'write a mixxx controler for Denon MC2000' (ok it was a little bit more specific) resulted in a workable skeleton and rapid development of the rest of the controller. One result of this approach was the use of wrapper functions, the initial skeltons lifted code from other Denon controller and the ai was then coaxed to use the components library. Although the wrapper functions are open to debate my conclusion is 'if it ain't broke don't fix it'.

- [Components.js](https://github.com/mixxxdj/mixxx/wiki/Components-JS) - Midi object abstraction layer
- [JogWHeel Script]( https://github.com/gold-alex/)


## ✍️ Author<a name = "authors"></a>

- [@gthomas99](https://github.com/gThomas99) - One day I may learn to DJ instead of writing controllers

## 🎉 Acknowledgements and References<a name = "acknowledgement"></a>

- [Denon Support]( https://www.denondj.com/downloads.html#legacy) legacy product
- [Serato MC2000 page]( https://serato.com/dj/hardware/denon-dj-mc2000)
- [Picheto's Mapping on MIXXX forum](https://mixxx.discourse.group/t/denon-mc2000-controller-midi-mapping-and-script/14103)
- [JogWHeel Script]( https://github.com/gold-alex/)


