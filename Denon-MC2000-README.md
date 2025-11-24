# Denon MC2000 Mixxx Controller Mapping

**Version:** 0.1.0-pre-beta (Smoke Tested)  
**Author:** Graham Thomas  
**Date:** November 2025  
**Status:** ⚠️ PRE-BETA - Most features implemented and smoke tested. Some functions may require further refinement and full beta testing.

---

## Overview

This is a custom controller mapping for the **Denon MC2000** DJ controller for use with Mixxx DJ software. The mapping utilizes the Mixxx Components JS framework for a modern, maintainable architecture with comprehensive LED feedback support.

### Implementation Status

✅ **Implemented** (may have bugs)  
⚠️ **Partially Implemented**  
❌ **Not Implemented**

| Feature Category | Status | Notes |
|-----------------|--------|-------|
| Transport Controls | ✅ | Play, cue, sync, keylock with proper button types |
| Hotcues | ✅ | 4 hotcues per deck, shift-to-delete |
| Loop Controls | ✅ | In/out/reloop/double/halve |
| Mixer (Per-Channel) | ✅ | Volume, 3-band EQ, track gain |
| Master Section | ✅ | Crossfader, master volume, headphone controls |
| PFL/Monitor Cue | ✅ | Channel-specific LED codes |
| FX Units | ✅ | 2 units × 3 effects (toggle, meta, wet/dry) |
| Library Navigation | ✅ | Focus switching, vertical scroll encoder |
| Load Track | ✅ | Direct load to deck buttons |
| Pitch Bend | ⚠️ | Scaffolded, needs testing |
| Jog Wheels | ⚠️ | Basic structure, scratch mode incomplete |
| LED Feedback | ⚠️ | Custom protocol implemented, needs verification |
| Shift Layers | ⚠️ | Implemented for some controls, needs expansion |
| Preview Deck | ✅ | Preview selected track in dedicated deck |
| Sampler Decks | ✅ | 8 samplers with play/pause buttons |
| Handler Wrappers | ✅ | Thin wrapper layer for XML mapping |

---

## Files

- **`Denon-MC2000.midi.xml`** - MIDI mapping definitions (controls, MIDI codes)
- **`Denon-MC2000-scripts.js`** - JavaScript controller logic
- **`Denon-MC2000-README.md`** - This documentation file
- **References:** Rotary Encoder Jogwheel Mixxx (jogTouch): https://github.com/gold-alex/Rotary-Encoder-Jogwheel-Mixxx

---

## Control Mapping

### Transport (Per Deck)

| Control | Function | Shift Function | LED |
|---------|----------|----------------|-----|
| Play | Play/Pause | - | Play indicator |
| Cue | Cue (preview when held) | Go to cue & play | Cue indicator |
| Sync | Beat sync | Sync lock toggle | Sync enabled |
| Keylock | Master tempo lock | - | Keylock enabled |
| Preview | Load and play selected track in Preview Deck | - | N/A |

### Hotcues (Per Deck)

| Pad | Normal | Shift |
|-----|--------|-------|
| 1-4 | Set/trigger hotcue | Delete hotcue |

**Note:** Sampler functionality was removed in favor of hotcue-only operation.

### Loop Controls (Per Deck)

| Control | Function | Shift Function |
|---------|----------|----------------|
| Loop In | Set loop in point | Reloop/Exit |
| Loop Out | Set loop out point | Exit loop |
| Loop Halve | Halve loop size | - |
| Loop Double | Double loop size | - |

### Mixer (Per Channel)

- **Volume Fader** - Channel volume
- **EQ High** - High frequency (3-band EQ)
- **EQ Mid** - Mid frequency
- **EQ Low** - Low frequency  
- **Track Gain** - Pregain/trim
- **PFL Button** - Headphone monitor cue (toggle)

### Master Section

- **Crossfader** - Deck crossfade
- **Master Volume** - Main output level
- **Headphone Volume** - Headphone output level
- **Headphone Mix** - Balance between master and PFL (cue)

### FX Units (2 Units)

Each unit has:
- **3 Effect Toggles** - Enable/disable effects (non-sequential MIDI codes!)
- **3 Effect Meta Pots** - Effect parameter control
- **Wet/Dry Encoder** - Effect mix (relative encoder, 0.05 step)

### Library Navigation

- **Focus Forward** (0x29) - Move between sidebar/tracklist
- **Focus Backward** (0x30) - Move between tracklist/sidebar
- **Scroll Vertical** (0x54) - Browse up/down (encoder)
- **Preview Button** (0x64) - Loads and plays selected track in Preview Deck

### Load Track

- **Load Deck 1** (0x64 on channel 0x90)
- **Load Deck 2** (0x64 on channel 0x91)
- **Preview Deck** (0x64) - Loads and plays selected track in Preview Deck

### Sampler Decks

- **8 Sampler Play Buttons** - Play/pause for each sampler deck

---

## Known Issues & Bugs

### Critical

1. **MIDI Codes Unverified**
   - All MIDI note/CC codes need verification against actual hardware
   - Some codes marked as "TODO" or placeholders in XML
   - Test each control and update `Denon-MC2000.midi.xml` accordingly

2. **LED Feedback**
   - Custom LED protocol implemented but not tested
   - Some LEDs may not respond correctly
   - Monitor cue uses different protocol (setLed2) - verify behavior

3. **Jog Wheels**
   - Basic structure exists but scratch mode incomplete
   - Sensitivity and touch detection need tuning
   - Vinyl mode toggle not implemented

### Medium Priority

4. **Encoder Sensitivities**
   - FX wet/dry uses 0.05 step - may be too coarse/fine
   - Library scroll encoder may need adjustment
   - Pitch bend sensitivity not tuned

5. **Shift Layers**
   - Implemented for cue (gotoandplay), sync (lock toggle)
   - Loop In shift (reloop) and Loop Out shift (exit) implemented
   - Hotcue shift (delete) implemented
   - Other controls don't have shift functions yet

6. **Component Fallbacks**
   - All handlers have fallback code if components fail to initialize
   - Fallback code less tested than component code
   - Monitor which code path is active via debug logging

### Low Priority

7. **Performance Optimizations**
   - LED update rate not optimized
   - Connection callbacks could be more efficient
   - Consider throttling some operations

---

## Changelog

### v0.1.0-pre-beta (November 2025)

**Smoke tested implementation:**
- ✅ Complete transport control architecture
- ✅ Hotcues with shift-to-delete (samplers removed)
- ✅ Loop controls with shift functions
- ✅ Full mixer section (volume, EQ, gain, crossfader)
- ✅ Master and headphone controls
- ✅ PFL buttons with custom LED protocol
- ✅ 2 FX units with toggles, meta pots, wet/dry encoders
- ✅ Library navigation (focus, scroll)
- ✅ Load track buttons
- ✅ Debug logging system
- ✅ Components-based architecture with LED feedback
- ✅ Preview deck and sampler deck support
- ✅ Handler wrappers for XML mapping
- ⚠️ Jog wheel scaffolding (incomplete)
- ⚠️ MIDI codes unverified
- ⚠️ Many bugs expected

---

## Contact

**Author:** Graham Thomas  
**Version:** 0.1.0-pre-beta  
**Date:** November 2025

For Mixxx-related questions, see: https://mixxx.org/
