/**
 * Denon MC2000 Mixxx Controller Mapping
 * Author: Graham Thomas
 * Version: 0.1.1-pre-beta (Smoke Tested)
 * Date: November 2025
 *
 * IMPLEMENTATION STATUS:
 * Pre-beta: Most features implemented and smoke tested. Some functions may require further refinement and full beta testing.
 *
 * IMPLEMENTED FEATURES:
 * - Transport controls (play, cue, sync, keylock) with Components-based architecture
 * - Hotcue buttons (4 per deck) with shift-to-delete functionality
 * - Loop controls (in/out/reloop/double/halve)
 * - Mixer controls (volume, 3-band EQ, track gain, crossfader)
 * - Master controls (master volume, headphone volume/mix)
 * - PFL/Monitor cue buttons (channel-specific LED codes)
 * - FX units (2 units × 3 effects with toggle, meta pots, wet/dry encoders)
 * - Library navigation (focus forward/backward, vertical scroll encoder)
 * - Load track to deck buttons
 * - Pitch bend/jog wheel scaffolding
 * - LED feedback system using custom MC2000.Led api with caching, see note below
 * - Shift layer support for transport and hotcue buttons
 * - Debug logging system (toggle via MC2000.debugMode flag)
 * - Preview deck and sampler deck support
 * - Handler wrappers for XML mapping, this is a thin wrapper layer that calls into the Components-based architecture

 *
 * KNOWN ISSUES:
 * - Sure there are plenty
 *
 * REFERENCES:
 * - Denon MC3000/MC4000/MC6000MK2 scripts in Mixxx source
 * - Mixxx Components JS library (midi-components-0.0.js)
 * - Custom LED protocol specific to MC2000 hardware
 * - Rotary Encoder Jogwheel Mixxx (jogTouch): https://github.com/gold-alex/Rotary-Encoder-Jogwheel-Mixxx
 *
 * USAGE:
 * 1. Ensure MIDI codes in Denon-MC2000.midi.xml match your hardware
 * 2. Enable debug mode (MC2000.debugMode = true) for troubleshooting
 * 3. Reload mapping via Preferences > Controllers after changes
 * 4. Check console output for "[MC2000-DEBUG]" messages
 */

// --- Controller Build Config ---
var MC2000Config = {
    useAltPitchBend: true, // If true, use alt <SHIFT> pitchbend buttons with jump 32 behavior. False is fwd back and forward
    useAltPlayShift: false, // If true, use alternate play shift method (reverse roll)
    setVolumeToSafeDefault: true, // If true, set mixer and master volumes to safe default levels on init
    // Add more options as needed 
    //and write code to implement
    // e.g., enableFxUnits: false,
    // customLedStartup: true,
};

//The actual MC2000 namespace object
var MC2000 = {};

///////////////////////////////////////
// JogWheel Tunable constants        //
///////////////////////////////////////
// JogWheel Scratch Parameters (adapted from JogWheelScratch.js)
// TICKS_PER_REV: Higher = less sensitive scratching
// 1) Increase TICKS_PER_REV from 96 -> 192
//    This halves scratch sensitivity again.
MC2000.jogResolution   = 125;         // ticks per revolution
// 2) "Heavier" vinyl & more damping to reduce drifting
//    ALPHA = 1/16 => bigger inertia (less easy to keep spinning), 
//    BETA  = ALPHA / 64 => more damping (stops creeping).
MC2000.jogRpm          = 33 +1/3;   // vinyl RPM force to float type
MC2000.jogAlpha = 1.0/16;     // bigger inertia (less easy to keep spinning)
MC2000.jogBeta  = (1.0/16)/64; // more damping (stops creeping)

// 3) If you truly want zero "fast spin" boost, keep MAX_SCALING=1.
//    If you want a slight boost at quick spins, try 2 or 3.
MC2000.jogMaxScaling   = 1.25;       // slight boost at quick spins

// Fine scrubbing when paused: smaller = finer control
MC2000.jogScrubScaling = 0.0001;     // extremely fine scrubbing
// Shifted-mode tunables
MC2000.jogShiftCoarseFactor = 20; // coarse seek multiplier when shift+scrub
MC2000.jogShiftScratchMultiplier = 1.25; // scratch multiplier when shift held and playing
MC2000.jogShiftScalingDivisor = 8; // divisor used to compute speedFactor in shifted mode
// When true, enable `slip_enabled` on the channel while scratch is enabled.
// If false, scratch will not toggle slip mode.
MC2000.jogEnableSlipOnScratch = false;
// Pitch bend scaling for CDJ mode (outer wheel when not scratching)
MC2000.jogPitchScale   = 1.0/4;      // scale for non-scratch jog (pitch bend)
// MIDI center value for relative encoder

MC2000.jogCenter       = 0x40;       // relative center value

//////////////////////////////
// Internal state           //
//////////////////////////////
// Global pitch ranges for keylock and pitch controls
MC2000.pitchRanges = [0.06, 0.08, 0.12, 0.50];
// Shift state: true if shift is currently held (button down)
MC2000.shiftHeld = false;
// Shift lock: true if shift lock is enabled (sticky shift)
MC2000.shiftLock = false;

//scratch and vinyl mode state tracking handled by component jogWHeel
// MC2000.scratchEnabled = {"[Channel1]": false, "[Channel2]": false};
MC2000.sampleMode = {"[Channel1]": false, "[Channel2]": false};
// //MC2000.vinylMode = {"[Channel1]": true, "[Channel2]": true}; // Track vinyl/CDJ mode state
// MC2000.deck = {
//     "[Channel1]": {scratchMode: false},
//     "[Channel2]": {scratchMode: false}
// };
// // JogWheel state tracking (index 0 unused, 1=deck1, 2=deck2)
// MC2000.jogScratchActive = [false, false, false];
// MC2000.jogReleaseTimer  = [null, null, null];
// MC2000.jogLastTickTime  = [0, 0, 0];
// MC2000.jogTickCount     = [0, 0, 0];


// Number of hotcues
MC2000.numHotcues      = 8;

// MIDI Reception commands (from spec)
MC2000.leds = {
	shiftlock: 		2,
	vinylmode: 		6,
	keylock: 		8,
	sync: 			9,

	cue1: 			17,
	cue2: 			19,
	cue3: 			21,
	cue4: 			23,

    // Sampler LEDs (Bank 1 - left deck)
	sampler1: 		0x19,
	sampler2: 		0x1b,
	sampler3: 		0x1d,
	sampler4: 		0x20,
	// Sampler LEDs (Bank 2 - right deck)
	sampler5: 		0x41,
	sampler6: 		0x43,
	sampler7: 		0x45,
	sampler8: 		0x47,
	
	samples_l: 		35, //sample / hotcue leds left deck
	samples_r: 		73,

	cue: 			38,
	play: 			39, // was wrong in the spec sheet as decimal value

	loopin: 		0x24, 
	loopout: 		0x40, 
	autoloop: 		0x2b,

	fx1_1: 			0x5c, 
	fx1_2: 			0x5d, 
	fx1_3: 			0x5e,
	
    fx2_1: 			0x60, 
	fx2_2: 			0x61,
	fx2_3: 			0x62,
    // "ALL SLIDER/VOLUME/FADER REQUEST": 57,
	monitorcue_l: 	69,
	monitorcue_r: 	81,
	
	
	// Sample mode indicator
	samplemode: 	0x1A
};

// ------------------------------------------------------------
// LED State & Manager API
// ------------------------------------------------------------
// Purpose: Provide a unified, cache-aware API for LED control while
// minimizing redundant MIDI traffic to the controller hardware.
// ------------------------------------------------------------

MC2000.LED_STATE = { OFF: 0x4B, ON: 0x4A, BLINK: 0x4C };

MC2000.LedManager = (function() {
    
    /**
     * cache: Stores the last known status byte for each LED/control per deck.
     * Key format is 'deck|code', where 'deck' is the deck number (1 or 2) and 'code' is the LED/control MIDI code.
     * Value is the status byte representing the LED/control state (e.g., ON, OFF, BLINK).
     * This cache is used to suppress redundant MIDI messages by only sending updates when the state changes,
     * improving performance and reducing unnecessary traffic to the controller hardware.
     */
    var cache = {}; // key: deck|code -> status byte

    // Build a table mapping LED symbolic names to their code and deck affinity.
    var LED_MAP = {};
    var allLedsMap = {};
    Object.keys(MC2000.leds).forEach(function(name) {
        var code = MC2000.leds[name];
        var decks;
        // Heuristics for deck-specific LEDs (sampler banks, monitor cues, suffixed keys)
        if (/(_l|monitorcue_l)$/i.test(name)) {
            decks = [1];
        } else if (/(_r|monitorcue_r)$/i.test(name)) {
            decks = [2];
        } else if (/^sampler[1-4]$/.test(name)) {
            decks = [1];
        } else if (/^sampler[5-8]$/.test(name)) {
            decks = [2];
        } else {
            // Shared indicator across both decks (e.g. sync, keylock, vinylmode)
            decks = [1, 2];
        }
        LED_MAP[name] = { code: code, decks: decks };
        allLedsMap[name] = 'on';
    });

    function normalize(status) {
        if (status === 0 || status === false || status === 'off') return MC2000.LED_STATE.OFF;
        if (status === 2 || status === 'blink') return MC2000.LED_STATE.BLINK;
        return MC2000.LED_STATE.ON; // default for truthy / 1 / true / 'on'
    }
    function key(deck, code) { return deck + '|' + code; }
    function send(deck, code, statusByte) {
        var k = key(deck, code);
        if (cache[k] === statusByte) return; // suppress redundant MIDI traffic
        cache[k] = statusByte;
        midi.sendShortMsg(0xB0 + (deck - 1), statusByte, code);
    }

    return {
        /**
         * allLedsMap: Object mapping all LED names to 'on' (default state for bulk operations).
         * Can be used externally to turn all LEDs on or off via bulk().
         */
        allLedsMap: allLedsMap,
        /**
         * Blink an LED for a given period/cycles, then restore its original state from cache.
         * Arguments are the same as blink: name, period, cycles, opts, callback.
         */
        blinkAndRestore: function(name, period, cycles, opts, callback) {
            var decks = (opts && opts.deck) ? [opts.deck] : this._LED_MAP[name].decks;
            var cache = this._dumpCache();
            var ledCode = MC2000.leds[name];
            decks.forEach(function(deckNum) {
                var cacheKey = deckNum + '|' + ledCode;
                var originalState = cache[cacheKey];
                if (typeof originalState === 'undefined') originalState = MC2000.LED_STATE.OFF;
                MC2000.LedManager.blink(name, period, cycles, {deck: deckNum}, function() {
                    MC2000.LedManager.setRaw(name, originalState, {deck: deckNum});
                    MC2000.debugLog("LED " + name + " blinked, restored to state: " + originalState);
                    if (typeof callback === 'function') callback();
                });
            });
        },
        set: function(name, status, opts) {
            var def = LED_MAP[name];
            if (!def) return;
            var decks = (opts && opts.deck) ? [opts.deck] : def.decks;
            var statusByte = normalize(status);
            decks.forEach(function(d) { send(d, def.code, statusByte); });
        },
        
        /**
         * Set multiple LEDs at once using a name->status map.
         * More efficient than individual set() calls when updating many LEDs.
         * 
         * Available LED names (from MC2000.leds):
         *   Transport: 'play', 'cue', 'sync', 'keylock'
         *   Hotcues: 'cue1', 'cue2', 'cue3', 'cue4'
         *   Loops: 'loopin', 'loopout', 'autoloop'
         *   FX: 'fx1_1', 'fx1_2', 'fx1_3', 'fx2_1', 'fx2_2', 'fx2_3'
         *   Samplers: 'sampler1' through 'sampler8', 'samp1_l' through 'samp4_r', 'samples_l', 'samples_r'
         *   Modes: 'vinylmode', 'shiftlock', 'samplemode'
         *   Monitor: 'monitorcue_l', 'monitorcue_r'
         * 
         * Status values: 'on', 'off', 'blink', or numeric 0/1/2, or boolean true/false
         * 
         * @param {Object} map - Object mapping LED names to status values
         * @example
         *   MC2000.LedManager.bulk({play: 'on', cue: 'off', sync: 'blink'});
         */
        bulk: function(map) {
            var self = this;
            Object.keys(map).forEach(function(n) { self.set(n, map[n]); });
        },
        
        /**
         * Reflect a Mixxx engine control value to an LED (boolean on/off).
         * Converts truthy/falsy values to LED on/off states. This is the primary
         * method for output() handlers in Components that need to sync LED state
         * with Mixxx engine controls.
         * 
         * Typically used in engine.makeConnection() callbacks to automatically
         * update LEDs when Mixxx control values change (e.g., play_indicator,
         * cue_indicator, sync_enabled, pfl, etc.).
         * 
         * @param {string} name - LED name from MC2000.leds
         * @param {*} value - Truthy (LED on) or falsy (LED off) value from Mixxx engine
         * @param {Object} [opts] - Optional {deck: 1|2} to target specific deck
         * @example
         *   // In a component output handler:
         *   this.output = function(value) {
         *       MC2000.LedManager.reflect("play", value, {deck: this.deckNumber});
         *   };
         *   this.connect = function() {
         *       engine.makeConnection(this.group, "play_indicator", this.output.bind(this));
         *   };
         */
        reflect: function(name, value, opts) {
            this.set(name, value ? 'on' : 'off', opts);
        },
        blink: function(name, period, cycles, opts, callback) {
            period = period || 500;
            cycles = cycles || 6; // total state flips
            var on = true;
            var fired = 0;
            var self = this;
            var timerId = engine.beginTimer(period, function() {
                self.set(name, on ? 'on' : 'off', opts);
                on = !on;
                fired++;
                if (fired >= cycles) {
                    if (MC2000.debugMode) MC2000.debugLog("LedManager.blink: stopping timer " + timerId + " for LED " + name);
                    engine.stopTimer(timerId);
                    if (typeof callback === 'function') callback();
                }
            });
            if (MC2000.debugMode) MC2000.debugLog("LedManager.blink: started timer " + timerId + " for LED " + name + " period=" + period + " cycles=" + cycles);
        },
        resetDefaults: function() {
            // Turn all LEDs OFF then enable vinylmode (matching legacy default intent)
            var offMap = {};
            Object.keys(LED_MAP).forEach(function(n) { offMap[n] = 'off'; });
            this.bulk(offMap);
            this.set('vinylmode', 'on');
        },
        raw: function(deck, code, status) { // bridge for legacy helpers
            send(deck, code, normalize(status));
        },
        setRaw: function(name, statusByte, opts) {
            // Direct status byte control (for PFL/monitorcue alternate protocol)
            var def = LED_MAP[name];
            if (!def) return;
            var decks = (opts && opts.deck) ? [opts.deck] : def.decks;
            decks.forEach(function(d) { send(d, def.code, statusByte); });
        },
        reflectAlt: function(name, value, opts) {
            // Alternate protocol for PFL buttons (0x50=ON, 0x51=OFF)
            this.setRaw(name, value ? 0x50 : 0x51, opts);
        },
        _dumpCache: function() { return JSON.parse(JSON.stringify(cache)); },
        _LED_MAP: LED_MAP
    };
})();

//////////////////////////////
// Utility helpers          //
//////////////////////////////
// Check if MIDI button value indicates "pressed" state
// NOTE: MC2000 may use 0x7F or 0x40 for button press - verify with MIDI capture
MC2000.isButtonOn = function(value) {
    return value === 0x7F || value === 0x40;
};

//////////////////////////////
// Debug logging            //
//////////////////////////////
// Set to true for development debugging, false for production
MC2000.debugMode = true;

MC2000.log = function(msg) { print("[MC2000] " + msg); };

MC2000.debugLog = function(msg) {
    if (MC2000.debugMode) {
        print("[MC2000-DEBUG] " + msg);
    }
};



//////////////////////////////
// Helper: Set mixer controls to safe default values
//////////////////////////////
MC2000.setDefaultMixerLevels = function() {
    if (MC2000.debugMode) MC2000.debugLog("Setting default mixer levels...");
    
    // For each deck
    ["[Channel1]", "[Channel2]"].forEach(function(group) {
        // Set volume to 50% (0.5) - safer default
        engine.setValue(group, "volume", 0.5);
        
        // Set pregain/track gain to unity (1.0)
        engine.setValue(group, "pregain", 1.0);
        
        // Set EQ to center/neutral (1.0 for Mixxx EQ)
        var eqGroup = "[EqualizerRack1_" + group + "_Effect1]";
        engine.setValue(eqGroup, "parameter1", 1.0); // Low
        engine.setValue(eqGroup, "parameter2", 1.0); // Mid
        engine.setValue(eqGroup, "parameter3", 1.0); // High
        
        // Set pitch/rate to center (0.0)
        engine.setValue(group, "rate", 0.0);
        
        // Set pitch range to 8% (common default)
        engine.setValue(group, "rateRange", 0.08);
    });
    
    // Set master volume to 50% (0.5) - safer default
    engine.setValue("[Master]", "volume", 0.5);
    
    // Set headphone mix to 50/50 (0.5)
    engine.setValue("[Master]", "headMix", 0.5);
    
    // Set headphone volume to 25% (0.25) - safer default
    engine.setValue("[Master]", "headVolume", 0.25);
    
    // Set FX units wet/dry to dry (0.0)
    engine.setValue("[EffectRack1_EffectUnit1]", "mix", 0.0);
    engine.setValue("[EffectRack1_EffectUnit2]", "mix", 0.0);
    
    if (MC2000.debugMode) MC2000.debugLog("Default mixer levels set");
};






//////////////////////////////
// Initialization           //
//////////////////////////////
MC2000.init = function(id) {
    MC2000.id = id;
    MC2000.log("Init controller " + id);
    
    // Check if required libraries are loaded - abort if missing
    var missingLibraries = [];
    if (typeof _ === "undefined") {
        missingLibraries.push("lodash");
    }
    if (typeof components === "undefined") {
        missingLibraries.push("components");
    }
    
    if (missingLibraries.length > 0) {
        MC2000.log("FATAL ERROR: Missing required libraries: " + missingLibraries.join(", "));
        // Blink vinylmode LED 5 times to indicate error, then turn off
        MC2000.LedManager.blink('vinylmode', 500, 10); // 10 flips = 5 blinks
        
        // Turn off vinylmode LED after blinking completes (5 seconds)
        engine.beginTimer(5100, function() {
            MC2000.LedManager.set('vinylmode', 'off');
        }, true);
     
        return; // Exit init - controller will not function
    }
    
    // Brief LED flash to confirm init started - turn all LEDs on
    MC2000.LedManager.bulk(MC2000.LedManager.allLedsMap);
        
    // Build Components-based structure with LED connections
    MC2000.buildComponents();

    // Build master controls
    MC2000.buildMasterControls();

    // Build FX units
    MC2000.buildFxUnits();

    // Build library controls
    MC2000.buildLibraryControls();

    // Build sampler decks
    MC2000.buildSamplerDecks();
    MC2000.buildPreviewDeck();

    //Decks etc are built with default values then MC2000Config is processed for different build options
    //Decks need to be built before making chages
    // Apply alternate pitch bend button behavior if configured
    if (typeof MC2000Config.useAltPitchBend !== 'undefined' && typeof MC2000Config.useAltPitchBend === 'boolean' && MC2000Config.useAltPitchBend) {
        MC2000.decks["[Channel1]"].pitchBendUpBtn.swapShiftFunction();
        MC2000.decks["[Channel1]"].pitchBendDownBtn.swapShiftFunction();
        MC2000.decks["[Channel2]"].pitchBendUpBtn.swapShiftFunction();
        MC2000.decks["[Channel2]"].pitchBendDownBtn.swapShiftFunction();
    }
    // Set default mixer levels (safe startup values)
    if (typeof MC2000Config.setVolumeToSafeDefault !== 'undefined' && typeof MC2000Config.setVolumeToSafeDefault === 'boolean' && MC2000Config.setVolumeToSafeDefault) {
           MC2000.setDefaultMixerLevels();
    }    
    
    // After 1 second delay, reset all LEDs to defaults and enable PFL on deck 1
   
    engine.beginTimer(1000, function() {
        MC2000.LedManager.resetDefaults();
        
        //blink key led to show pitch range
        MC2000.decks["[Channel1]"].keylock.blinkLed();
        MC2000.decks["[Channel2]"].keylock.blinkLed();

        // Enable PFL/headphone cue on deck 1 after LED reset
        engine.setValue("[Channel1]", "pfl", 1);
        
        MC2000.log("Controller initialized successfully");
    }, true); // one-shot timer
};

MC2000.shutdown = function() {
    MC2000.log("Shutdown controller");
    // Turn off all LEDs
    MC2000.LedManager.resetDefaults();
};
//////////////////////////////
// Shift button handler: push-to-hold logic

MC2000.toggleShift = function(_channel, _control, value) {
    MC2000.shiftHeld = MC2000.isButtonOn(value);
    MC2000.updateShiftState();
};

// Update effective shift state and apply to all decks, and update shift lock LED
// loops over each group unit and calls their applyShiftState method if it exists   
MC2000.updateShiftState = function() {
    var effectiveShift = MC2000.shiftHeld || MC2000.shiftLock;
    if (MC2000.decks) {
        Object.keys(MC2000.decks).forEach(function(g){
            var d = MC2000.decks[g];
            if (!d) return;
            if (d.applyShiftState) d.applyShiftState(effectiveShift);
        });
    }
    if (MC2000.fxUnits) {  
             Object.keys(MC2000.fxUnits).forEach(function(g){
            var f = MC2000.fxUnits[g];
            if (!f) return;
            if (f.applyShiftState) f.applyShiftState(effectiveShift);
        });
    }
    // Update shift lock LED: ON if locked, OFF if not
    MC2000.LedManager.reflect("shiftlock", MC2000.shiftLock);
};

// Helper: get current effective shift state (held or locked)
MC2000.isShiftActive = function() {
    return MC2000.shiftHeld || MC2000.shiftLock;
};
//////////////////////////////
// Master Controls          //
//////////////////////////////
MC2000.buildMasterControls = function() {
    // Main output volume
    MC2000.masterVolumePot = new components.Pot({
        group: "[Master]",
        inKey: "gain"
    });
    
    // Crossfader
    MC2000.crossfaderPot = new components.Pot({
        group: "[Master]",
        inKey: "crossfader"
    });
    
    // Headphone volume
    MC2000.headphoneVolumePot = new components.Pot({
        group: "[Master]",
        inKey: "headVolume"
    });
    
    // Headphone mix (master/PFL balance)
    MC2000.headphoneMixPot = new components.Pot({
        group: "[Master]",
        inKey: "headMix"
    });
};

//////////////////////////////
// FX Units                 //
//////////////////////////////
MC2000.FxUnit = function(unitNumber) {
        
    this.group = "[EffectRack1_EffectUnit" + unitNumber + "]";
    this.unitNumber = unitNumber;
    this.effects = [];
    //focus is used by wetDry encoder shift method to determine which deck's sampler to adjust
    // Set focus for FX unit: odd decks start at 1, even decks start at 5
    this.focus = (unitNumber % 2 === 1) ? 1 : 5;
    //this.focus = 1;
 
    var self = this;
     /**
     * Increment the focus variable, wrapping within the correct sampler range for each deck.
     * Deck 1: samplers 1-4; Deck 2: samplers 5-8
     * @param {number} deckNumber - 1 or 2
     * //deck number should match this.unitNumber
     */
    this.incrementFocus = function(deckNumber) {
        MC2000.debugLog("FX Unit " + self.unitNumber + " Incrementing focus from " + this.focus + " on deck " + deckNumber);
        if (deckNumber % 2 === 1) {
            // Odd deck: cycle through samplers 1-4
            MC2000.debugLog("Deck1 focus increment");
            this.focus = (this.focus % 4) + 1;
        } else {
            MC2000.debugLog("Deck2 focus increment");
            // Even deck: cycle through samplers 5-8
            var adjustedFocus = this.focus - 4;
            this.focus = (adjustedFocus % 4) + 5;
        }
        // Blink sampler button LED for 750 ms, then restore original state
        // LED will only light if Sample Mode on controller is on, otherwise pads are used for Hotcues
        MC2000.debugLog("FX Unit " + self.unitNumber + " New focus is " + this.focus);
        var ledName = "sampler" + this.focus;
        
        MC2000.debugLog("FX Unit " + self.unitNumber + " Blinking LED: " + ledName );
        //wow blink allows callbacks so this should be non-blocking code
        MC2000.LedManager.blinkAndRestore(ledName, 250, 4, {deck: deckNumber}, function() {
            MC2000.debugLog("FX Unit " + self.unitNumber + " Restored LED: " + ledName);
        });
    };

    
    // Build 3 effects per unit using array
    for (var i = 1; i <= 3; i++) {
        var effectGroup = "[EffectRack1_EffectUnit" + unitNumber + "_Effect" + i + "]";
        var ledName = "fx" + unitNumber + "_" + i;
        
        this.effects[i] = {
            toggle: new components.Button({
                group: effectGroup,
                inKey: "enabled",
                type: components.Button.prototype.types.toggle,
            }),
            meta: new components.Pot({
                group: effectGroup,
                inKey: "meta"
            })
        };
        
        // Add LED output handler and connection for each toggle button
        (function(effectIndex, ledKey) {
            self.effects[effectIndex].toggle.output = function(value) {
                if (MC2000.leds[ledKey] !== undefined) {
                    // FX buttons on both units use deck 1 (status 0xB0)
                    MC2000.LedManager.reflect(ledKey, value, {deck: 1});
                }
                if (MC2000.debugMode) {
                    MC2000.debugLog("FX" + self.unitNumber + " Effect" + effectIndex + " LED: " + value);
                }
            };
            
            self.effects[effectIndex].toggle.connect = function() {
                engine.makeConnection(this.group, "enabled", this.output.bind(this));
            };
        })(i, ledName);
    }
    
    // Wet/Dry encoder (relative encoder for mix control)
    this.wetDryEncoder = new components.Encoder({
        group: this.group,
        inKey: "mix"
    });
    // Store both input methods
    this.wetDryEncoder.normalInput = function(channel, control, value, status, group) {
        MC2000.debugLog("FX Unit " + self.unitNumber + " Wet/Dry encoder: " + value);
        if (value === 1) {
            // Counterclockwise: decrease wet/dry mix
            this.inSetParameter(this.inGetParameter() + 0.05);
        } else if (value === 127) {
            // Clockwise: increase wet/dry mix
            this.inSetParameter(this.inGetParameter() - 0.05);
        }
    };

    // Shifted input method: adjust sampler volume instead. sampler index is the sa,pler number
    this.wetDryEncoder.shiftInput = function(channel, control, value, status, group) {
        // Use value to determine direction works in rev
        var direction = (value === 127) ? 1 : (value === 1 ? -1 : 0);
        if (direction === 0) return;

        MC2000.debugLog("FX Unit " + self.unitNumber + " Focus " + self.focus + " Wet/Dry encoder shift: " + direction);
        var samplers = MC2000.samplers;
        var focusIdx = self.focus; // FxUnit's focus variable (1-8)
        var sampler = samplers[focusIdx];
        MC2000.debugLog("Adjusting volume for sampler " + focusIdx);
        if (!sampler) return;
        var group = sampler.group;
        var currentGain = engine.getValue(group, "pregain");
        var newGain = Math.max(0, Math.min(4, currentGain + (direction * 0.05)));
        MC2000.debugLog("Current pregain: " + currentGain + ", new pregain: " + newGain);
        engine.setValue(group, "pregain", newGain);
        MC2000.debugLog("New pregain for sampler " + focusIdx + ": " + engine.getValue(group, "pregain"));
        if (MC2000.debugMode) MC2000.debugLog("Set pregain for " + group + " to " + newGain);
    };
    // Assign input methods
    this.wetDryEncoder.shift = this.wetDryEncoder.shiftInput;  
    this.wetDryEncoder.input = this.wetDryEncoder.normalInput;
    /**
     * Apply shift state to FX unit: sets wetDryEncoder input method.
     * @param {boolean} shifted - true if shift is active
     */
    this.applyShiftState = function(shifted) {
        if (this.wetDryEncoder) {
            this.wetDryEncoder.input = shifted ? this.wetDryEncoder.shift : this.wetDryEncoder.input;
        }
    };
};

MC2000.buildFxUnits = function() {
    MC2000.fxUnits = {
        1: new MC2000.FxUnit(1),
        2: new MC2000.FxUnit(2)
    };
    
    // Connect all FX toggle button LEDs
    for (var unitNum = 1; unitNum <= 2; unitNum++) {
        for (var effectNum = 1; effectNum <= 3; effectNum++) {
            var toggle = MC2000.fxUnits[unitNum].effects[effectNum].toggle;
            if (toggle && toggle.connect) {
                toggle.connect();
            }
        }
    }

    // Assign fxUnit to each deck's beatTapBtn using channel group
    if (MC2000.decks) {
        Object.keys(MC2000.decks).forEach(function(group) {
            var deck = MC2000.decks[group];
            if (deck && deck.beatTapBtn) {
                deck.beatTapBtn.fxUnit = (deck.deckNumber === 1) ? MC2000.fxUnits[1] : MC2000.fxUnits[2];
            }
            MC2000.debugLog("Assigned FX unit to deck " + deck.deckNumber + " beatTapBtn" + (deck.beatTapBtn ? " (assigned)" : " (no beatTapBtn)")); 
        });
    }
    
    if (MC2000.debugMode) MC2000.debugLog("FX units built with LED connections");
};

//////////////////////////////
// Library Controls         //
//////////////////////////////
MC2000.buildLibraryControls = function() {
    // All Library functions handled as components
    // Only need encoder component for vertical scrolling
    
    // Vertical scroll encoder (browse up/down in library)
    MC2000.scrollVerticalEncoder = new components.Encoder({
        group: "[Library]",
        inKey: "MoveVertical"
    });
    
    // Custom input for relative encoder
    MC2000.scrollVerticalEncoder.input = function(channel, control, value, status, group) {
        if (value === 1) {
            // Counterclockwise: move up
            engine.setValue("[Library]", "MoveUp", 1);
        } else if (value === 127) {
            // Clockwise: move down
            engine.setValue("[Library]", "MoveDown", 1);
        }
    };
    
    // Library focus forward button component
    MC2000.libraryFocusForwardComp = new components.Button({
        group: "[Library]",
        type: components.Button.prototype.types.push,
    });
    MC2000.libraryFocusForwardComp.input = function(channel, control, value, status, group) {
        if (!this.isPress(channel, control, value, status)) return;
        engine.setValue("[Library]", "MoveFocusForward", 1);
        if (MC2000.debugMode) MC2000.debugLog("Library: MoveFocusForward triggered");
    };
    
    // Library focus backward button component
    MC2000.libraryFocusBackwardComp = new components.Button({
        group: "[Library]",
        type: components.Button.prototype.types.push,
    });
    MC2000.libraryFocusBackwardComp.input = function(channel, control, value, status, group) {
        if (!this.isPress(channel, control, value, status)) return;
        engine.setValue("[Library]", "MoveFocusBackward", 1);        
    };
    
    // Library GoToItem button component
    MC2000.libraryGoToItemComp = new components.Button({
        group: "[Library]",
        type: components.Button.prototype.types.push,
    });
    MC2000.libraryGoToItemComp.input = function(channel, control, value, status, group) {
        if (!this.isPress(channel, control, value, status)) return;
        engine.setValue("[Library]", "GoToItem", 1);        
    };
               
};
    

//////////////////////////////
// Sampler Decks            //
//////////////////////////////
MC2000.SamplerDeck = function(samplerNumber) {
    this.group = "[Sampler" + samplerNumber + "]";
    this.samplerNumber = samplerNumber;
    // Deck 1 for samplers 1-4, Deck 2 for samplers 5-8
    this.deckNumber = samplerNumber <= 4 ? 1 : 2;

    // Consistent reference to instance
    var self = this;
    
    // Play button - use push type for proper sampler behavior
    this.playButton = new components.Button({
        group: this.group,
        type: components.Button.prototype.types.push,
    });
    
    // Custom input: play from start if stopped, stop if playing
    this.playButton.input = function(channel, control, value, status, group) {
        if (!this.isPress(channel, control, value, status)) return; // Only act on press
        var isPlaying = engine.getValue(group, "play");
        if (isPlaying) {
            engine.setValue(group, "play", 0);
            //engine.setValue(group, "stutter_play", 1);
        } else {
            engine.setValue(group, "cue_gotoandplay", 1);
        }
    };

    
    
    this.playButton.output = function(value) {
        var ledName = "sampler" + self.samplerNumber;
        if (MC2000.leds[ledName] !== undefined) {
            MC2000.LedManager.reflect(ledName, value, {deck: self.deckNumber});
        }
        if (MC2000.debugMode) MC2000.debugLog("Sampler" + self.samplerNumber + " play LED: " + value);
    };
    this.playButton.connect = function() {
        engine.makeConnection(this.group, "play", this.output.bind(this));
    };
};

MC2000.buildSamplerDecks = function() {
    MC2000.samplers = {};
    
    // Build 8 samplers (2 banks of 4)
    for (var i = 1; i <= 8; i++) {
        MC2000.samplers[i] = new MC2000.SamplerDeck(i);
        if (MC2000.samplers[i].playButton && MC2000.samplers[i].playButton.connect) {
            MC2000.samplers[i].playButton.connect();
        }
    }
    
    if (MC2000.debugMode) MC2000.debugLog("Sampler decks built (8 samplers)");
};

//////////////////////////////
// Preview Deck Group       //
//////////////////////////////
MC2000.PreviewDeck = function() {
    this.group = "[PreviewDeck1]";
    // Play button for preview deck
    this.playButton = new components.Button({
        group: this.group,
        inKey: "play",
        type: components.Button.prototype.types.toggle,
    });
    this.playButton.output = function(value) {
        // No LED, but could log or trigger feedback
        if (MC2000.debugMode) MC2000.debugLog("PreviewDeck play: " + value);
    };
    //there is no led for preview deck but keep the connect method for consistency
    this.playButton.connect = function() {
        engine.makeConnection(this.group, "play", this.output.bind(this));
    };
};

MC2000.buildPreviewDeck = function() {
    MC2000.previewDeck = new MC2000.PreviewDeck();
    if (MC2000.previewDeck.playButton && MC2000.previewDeck.playButton.connect) {
        MC2000.previewDeck.playButton.connect();
    }
    if (MC2000.debugMode) MC2000.debugLog("Preview deck built");
};


////////////////////////////////////////////
// Components wiring   Deck Controls      //
////////////////////////////////////////////
MC2000.Deck = function(group) {
    this.group = group;
    var self = this;
    
    // Get deck number (1 or 2)
    this.deckNumber = (group === "[Channel1]") ? 1 : 2;

    // Play: toggle play/pause on button press only
    this.play = new components.Button({
        group: group,
        inKey: "play",
        type: components.Button.prototype.types.toggle,
    });
    this.play.output = function(value) {
        MC2000.LedManager.reflect("play", value, {deck: self.deckNumber});
    };
    this.play.connect = function() {
        engine.makeConnection(this.group, "play_indicator", this.output.bind(this));
    };
    // Store the original input method
    this.play.originalInput = this.play.input;
    // Standard shift method
    this.play.shiftedInput = function(_ch, _ctrl, value, _status, group) {
        if (!this.isPress(_ch, _ctrl, value, _status)) return;
        engine.setValue(group, "cue_gotoandplay", 1);
    };

    // Alternate shift method: reverse roll
    this.play.altShiftInput = function(_ch, _ctrl, value, _status, group) {
        // Only activate reverse roll while both shift and play are pressed
        if (MC2000.shiftHeld && value) {
            if (engine.getValue(group, "reverseroll") !== 1) {
                engine.setValue(group, "reverseroll", 1);
            }
        } else {
            if (engine.getValue(group, "reverseroll") === 1) {
                engine.setValue(group, "reverseroll", 0);
            }
        }
    };
    // Function pointer for shift behavior
    this.play.shiftFunction = this.play.shiftedInput;
    this.play.unshift = function() {
        this.input = this.originalInput;
    };
    this.play.shift = function() {
        this.input = this.shiftFunction;
    };
    this.play.unshift();
    
    // Method to swap shiftFunction between shiftedInput and altShiftInput
    this.play.swapShiftFunction = function() {
        this.shiftFunction = (this.shiftFunction === this.shiftedInput)
            ? this.altShiftInput
            : this.shiftedInput;
    };
    // Initialize shiftFunction based on config
    if (typeof MC2000Config.useAltPlayShift === "boolean" && MC2000Config.useAltPlayShift) {
        this.play.shiftFunction = this.play.altShiftInput;
        this.play.shift();
    }

    // Cue: cue type button; Shift: gotoandplay
    this.cue = new components.Button({
        group: group,
        inKey: "cue_default",
        type: components.Button.prototype.types.cue,
    });
    this.cue.output = function(value) {
        MC2000.LedManager.reflect("cue", value, {deck: self.deckNumber});
    };
    this.cue.connect = function() {
        engine.makeConnection(this.group, "cue_indicator", this.output.bind(this));
    };
    
    // Store the original input method from the cue type
    this.cue.originalInput = this.cue.input;
    
    this.cue.unshift = function() {
        // Restore original cue behavior
        this.inKey = "cue_default";
        this.input = this.originalInput;
    };
        this.cue.shift = function() {
        // Override with gotoandplay behavior
        this.input = function(_ch,_ctrl,value,_status,group){
            if (!this.isPress(_ch, _ctrl, value, _status)) return;
            engine.setValue(group, "playposition", 0.0);
        };
    };

    // Sync: unshift one-shot beatsync (or sync lock if held), shift toggles sync lock
    this.sync = new components.Button({
        group: group,
    });
    this.sync.longPressTimer = 0;
    this.sync.longPressCancelled = false;
    this.sync.longPressThreshold = 500; // 0.5 second in milliseconds
    var deckSelf = self; // Capture parent Deck context
    this.sync.input = function(channel, control, value, status, group) {
        if (this.isPress(channel, control, value, status)) {
            // Button pressed
            if (MC2000.isShiftActive()) {
                // Shift: toggle sync lock immediately
                script.toggleControl(group, "sync_enabled");
            } else {
                // Check if sync lock is already enabled
                var syncEnabled = engine.getValue(group, "sync_enabled");
                if (syncEnabled) {
                    // Sync lock is on: turn it off immediately
                    engine.setValue(group, "sync_enabled", 0);
                } else {
                    // Sync lock is off: start timer for long press detection
                    var btnSelf = this;
                    this.longPressTimer = engine.beginTimer(this.longPressThreshold, function() {
                        // Long press: enable sync lock unless cancelled
                        if (btnSelf.longPressCancelled) {
                            btnSelf.longPressCancelled = false;
                            btnSelf.longPressTimer = 0;
                            return;
                        }
                        engine.setValue(group, "sync_enabled", 1);
                        btnSelf.longPressTimer = 0;
                    }, true); // one-shot timer
                    if (MC2000.debugMode) MC2000.debugLog("sync.longPress: started timer " + this.longPressTimer + " for group " + group + " threshold=" + this.longPressThreshold);
                }
            }
        } else {
            // Button released
            if (this.longPressTimer !== 0) {
                // Short press: mark the long-press timer cancelled and let it expire
                this.longPressCancelled = true;
                if (MC2000.debugMode) MC2000.debugLog("sync.longPress: cancelled timer " + this.longPressTimer + " for group " + group);
                this.longPressTimer = 0;
                engine.setValue(group, "beatsync", 1);

                // Blink sync LED for 1000ms to show one-shot beatsync
                MC2000.LedManager.blinkAndRestore("sync", 1000, 4, {deck: deckSelf.deckNumber});
            }
        }
    };

   
    this.sync.output = function(value) {
        MC2000.LedManager.reflect("sync", value, {deck: self.deckNumber});
       
    };
    
    this.sync.connect = function() {
        engine.makeConnection(this.group, "sync_enabled", this.output.bind(this));
    };

    // Keylock: toggle keylock (master tempo)
    this.keylock = new components.Button({
        group: group,
        type: components.Button.prototype.types.push,
    });
    // Blink keylock LED helper to indicate pitch range 
    this.keylock.blinkLed = function() {
        var pitchRange = engine.getValue(this.group, "rateRange");
        var ranges = MC2000.pitchRanges;

        // Blink pattern map: index matches pitchRanges index (probably should be declared globally)
        var blinkPatterns = [
            {period: 800, cycles: 2}, // 6%
            {period: 500, cycles: 3}, // 8%
            {period: 350, cycles: 4}, // 12%
            {period: 200, cycles: 6}  // 50%
        ];
        //pattern is based on pitch range index
        var idx = ranges.indexOf(pitchRange);
        var pattern = blinkPatterns[idx] || {period: 500, cycles: 2};
        MC2000.LedManager.blinkAndRestore("keylock", pattern.period, pattern.cycles, {deck: self.deckNumber});
    };
    this.keylock.normalInput = function(channel, control, value, status, group) {
        if (!this.isPress(channel, control, value, status)) return;
        // Normal: toggle keylock on/off
        engine.setValue(group, "keylock", !engine.getValue(group, "keylock"));
    };
    this.keylock.shiftedInput = function(channel, control, value, status, group) {
        if (!this.isPress(channel, control, value, status)) return;
        // Shift: cycle pitch range (6% -> 10% -> 24% -> 50% -> 6%)
        var currentRange = engine.getValue(group, "rateRange");
        var ranges = MC2000.pitchRanges;
        var currentIndex = ranges.indexOf(currentRange);
        var nextIndex = (currentIndex + 1) % ranges.length;
        engine.setValue(group, "rateRange", ranges[nextIndex]);
        if (MC2000.debugMode) {
            MC2000.debugLog(group + " pitch range: " + (ranges[nextIndex] * 100) + "%");
        }
        // Blink LED when pitch range is changed
        this.blinkLed();
    };
    this.keylock.unshift = function() {
        this.input = this.normalInput;
    };
    this.keylock.shift = function() {
        this.input = this.shiftedInput;
    };
    this.keylock.unshift();
    this.keylock.output = function(value) {
        MC2000.LedManager.reflect("keylock", value, {deck: self.deckNumber});
        // Optionally blink LED from output if needed elsewhere
        // Example usage: this.blinkLed();
    };
    this.keylock.connect = function() {
        engine.makeConnection(this.group, "keylock", this.output.bind(this));
    };

    // Monitor Cue (PFL): toggle headphone cue
    this.pfl = new components.Button({
        group: group,
        inKey: "pfl",
        type: components.Button.prototype.types.toggle,
    });
    this.pfl.output = function(value) {
        // Use reflectAlt for monitor cue as it has alternate LED protocol (0x50/0x51)
        var ledName = (self.deckNumber === 1) ? "monitorcue_l" : "monitorcue_r";
        MC2000.LedManager.reflectAlt(ledName, value, {deck: self.deckNumber});
    };
    this.pfl.connect = function() {
        engine.makeConnection(this.group, "pfl", this.output.bind(this));
    };
    
    // Sample Mode Toggle button
    this.sampleModeToggle = new components.Button({
        group: group,
        type: components.Button.prototype.types.push,
    });
    this.sampleModeToggle.input = function(channel, control, value, status, group) {
        if (!this.isPress(channel, control, value, status)) return;
        
        // Toggle sample mode state for this deck
        MC2000.sampleMode[group] = !MC2000.sampleMode[group];
        
        // Update LED
        MC2000.LedManager.reflect("samplemode", MC2000.sampleMode[group], {deck: self.deckNumber});
        
        if (MC2000.debugMode) {
            MC2000.debugLog(group + " sample mode: " + (MC2000.sampleMode[group] ? "ON" : "OFF"));
        }
    };
    this.sampleModeToggle.output = function(value) {
        MC2000.LedManager.reflect("samplemode", value, {deck: self.deckNumber});
    };
    this.sampleModeToggle.connect = function() {
        // Initialize LED state
        this.output(MC2000.sampleMode[group]);
    };

    // Load Track button
    this.loadTrackBtn = new components.Button({
        group: group,
        type: components.Button.prototype.types.push,
    });

    /*******************************************************************
     * https://github.com/gold-alex/Rotary-Encoder-Jogwheel-Mixxx/blob/main/JogWheelScratch.js
     * 
     * JogWheelScratch.js 
     * 
     * Goals:
     *  - Extremely fine scrubbing (no big jumps when paused).
     *  - Less forward drift when rocking back & forth in scratch mode.
     *  - Lower sensitivity (you must rotate the encoder more to move).
     *******************************************************************/

    //jog wheel component constructor
    this.jogWheel = new components.JogWheelBasic({
        group: group,
        inkey: "jog", //default value in components
        deck: MC2000.deckIndex(group), // whatever deck this jogwheel controls
        vinylMode: true, // defaults value is  true

        //use global vars for jog parameters (fall back to canonical names if missing)
        wheelResolution: (typeof MC2000.jogWheelResolution === 'number') ? MC2000.jogWheelResolution : MC2000.jogResolution, // ticks per revolution
        alpha: (typeof MC2000.jogAlpha === 'number') ? MC2000.jogAlpha : MC2000.jogScratchAlpha, // alpha-filter
        beta: (typeof MC2000.jogBeta === 'number') ? MC2000.jogBeta : MC2000.jogScratchBeta, // beta-filter
        rpm: (typeof MC2000.jogRpm === 'number') ? MC2000.jogRpm : 33.333333333333336, // platter rotation speed at full speed

        //some extra parameters to manage relative tick counts  and internal states
        tickCount: 0, // count of ticks since last time-based reset
        lastTickTime: Date.now(), // last tick time per deck index (1-based)
        scratchEnabled: false, // scratch mode enabled state
        
        // Whether enabling scratch should also enable slip mode on the channel
        useSlipOnScratch: (typeof MC2000.jogEnableSlipOnScratch === 'boolean') ? MC2000.jogEnableSlipOnScratch : true,
       
        //additional jog parameters
        jogPitchScale: MC2000.jogPitchScale, // scale factor for pitch bend nudging
        jogMaxScaling: MC2000.jogMaxScaling, // max scaling factor for pitch bend nudging
        jogScrubScaling: MC2000.jogScrubScaling, // scaling factor for scrub mode when paused
       
    });

    //jog wheel touch handler - enable or disable scratching
    this.jogWheel.inputTouch = function(channel, control, value, status, _group) {
        
        //turn on scratch engine when user touches top of wheel
        if(this.isPress(channel, control, value, status)){
            if (this.useSlipOnScratch) {
                try { engine.setValue(group, "slip_enabled", 1); } catch (e) {}
            }
            engine.scratchEnable(this.deck,
                this.wheelResolution,
                this.rpm,
                this.alpha,
                this.beta);
            this.scratchEnabled = true;
            MC2000.debugLog("jogWheel: Scratch enabled on deck " + this.deck + " RPM=" + this.rpm);

             //this will only occur because we are in vinyl mode but check logic is correct
            if(!this.vinylMode  ){
                MC2000.debugLog("jogWheel: LOGIC ERROR inputTouch called but vinylMode is false on deck " + this.deck);
        }
        }
        else {
            //user has released top of wheel
            engine.scratchDisable(this.deck);
            if (this.useSlipOnScratch) {
                try { engine.setValue(group, "slip_enabled", 0); } catch (e) {
                    MC2000.debugLog("Failed to disable slip mode on deck " + this.deck);
                }
            }
            this.scratchEnabled = false;
        }
    };

    //normalises and set sign for jog wheel ticks
    this.jogWheel.getMovement = function(value) {
        var movement = value - 0x040; // MC2000.jogCenter

        if (movement > 64) movement -= 128;
        if (movement < -64) movement += 128;
        return movement;
    };

    //process this.ticks, if no meovement is detetected is last 150ms then counter set to 0
    //higher tick count (over thre) uses higher speed factor for jog wheel movement
    this.jogWheel.tickUpdate = function() {
        var now = Date.now();
        var timeDiff = now - this.lastTickTime;
        if (timeDiff > 150) {
            this.tickCount = 0;
        }

        this.tickCount++;
        this.lastTickTime = now;

    };

    // Separate method for shifted wheel behavior: coarse seek when paused,
    // stronger scratch when playing. Tunables are exposed via MC2000.* vars.
    this.jogWheel.inputWheelShift = function(channel, control, value, status, group) {
        var movement = this.getMovement(value);

        if (movement === 0) return; // No movement, ignore
        // Ensure scratch disabled when scrubbing
        //this.disableScratch();
        this.tickUpdate();

        // SCRUB MODE (paused) when shift is held: coarser seeking
        var speedFactorShift = Math.min(1 + this.tickCount / MC2000.jogShiftScalingDivisor, this.jogMaxScaling * 1.5);
        var effectiveScaling = (this.tickCount > 3) ? speedFactorShift : 1;
        var coarseFactor = MC2000.jogShiftCoarseFactor || 20; // coarse multiplier for shifted scrub
        
        // SCRUB MODE (paused) when shift is held: coarser seeking
        //MC2000.debugLog("jogWheel (shift): Scrub mode, tickCount=" + this.tickCount + ", effectiveScaling=" + effectiveScaling);
        var pos = engine.getValue("[Channel" + this.deck + "]", "playposition");
        pos += (movement * effectiveScaling * this.jogScrubScaling * coarseFactor);
        if (pos < 0) pos = 0;
        if (pos > 1) pos = 1;
        engine.setValue("[Channel" + this.deck + "]", "playposition", pos);
        
    };

    // Normal jog wheel handler: scratch when playing, 
    this.jogWheel.inputWheel = function(channel, control, value, status, group) {
        var movement = this.getMovement(value);
        if (movement === 0) return; // No movement, ignore

        //user has touched top of wheel and scratch engine is running
        //if(this.vinylMode && this.scratchEnabled){
        if (engine.isScratching(this.deck)) {
            this.tickUpdate();
            var speedFactor = Math.min(1 + this.tickCount / 10, this.jogMaxScaling);
           
            engine.scratchTick(this.deck, movement * speedFactor);
        //MC2000.debugLog("jogWheel: inputWheel, tickCount=" + this.tickCount + ", speedFactor=" + speedFactor + ", movement=" + movement);
        } 
        //side touch only so jog wheel.( pitch bend nudging)
        else {
            engine.setValue(group, "jog", movement * this.jogPitchScale);
        }
    };

    // Preserve a reference to the normal wheel handler and wire up shift/unshift
    this.jogWheel.inputWheelNormal = this.jogWheel.inputWheel;
    this.jogWheel.inputWheel = this.jogWheel.inputWheelNormal;
    this.jogWheel.unshift = function() { this.inputWheel = this.inputWheelNormal; };
    this.jogWheel.shift = function() { this.inputWheel = this.inputWheelShift; };
    
    //overide default input method , this will receive vinylMode button press
    //output handler not required as this is handled by hardware
    this.jogWheel.input = function(channel, control, value, status, group) {
        // Only act on button press, not release
            if (!this.isPress(channel, control, value, status)) return;
    
        // Toggle vinyl mode state
        this.vinylMode = !this.vinylMode
        MC2000.debugLog("Vinyl/CDJ mode toggled for " + group + ": " + 
                    (this.vinylMode ? "VINYL" : "CDJ"));
        //turn off scratch engine if switching to CDJ mode
        if (!this.vinylMode && this.scratchEnabled) {
            engine.scratchDisable(this.deck);
            this.scratchEnabled = false;

            //check if slip mode needs to be disabled
            if(engine.getValue(group, "slip_enabled") === 1){
                try { engine.setValue(group, "slip_enabled", 0); } catch (e) {
                    MC2000.debugLog("Failed to disable slip mode on deck " + this.deck);
                }
            }
        }            
    
    };
    
    // Load Track button: normal loads selected track, shift ejects/unloads
    this.loadTrackBtn.normalInput = function(channel, control, value, status, group) {
        if (!this.isPress(channel, control, value, status)) return;
        // Normal: Load selected track
        engine.setValue(group, "LoadSelectedTrack", 1);
        if (MC2000.debugMode) MC2000.debugLog("Load track to " + group);
    };
    this.loadTrackBtn.shiftedInput = function(channel, control, value, status, group) {
        if (!this.isPress(channel, control, value, status)) return;
        // Shift: Eject/unload track
        engine.setValue(group, "eject", 1);
        if (MC2000.debugMode) MC2000.debugLog("Eject track from " + group);
    };
    this.loadTrackBtn.unshift = function() {
        this.input = this.normalInput;
    };
    this.loadTrackBtn.shift = function() {
        this.input = this.shiftedInput;
    };
    this.loadTrackBtn.unshift();

    // Track Gain: pregain/track gain knob
    this.trackGain = new components.Pot({ group: group, inKey: "pregain" });

    // Volume: channel volume fader
    this.volume = new components.Pot({ group: group, inKey: "volume" });

    // EQ: high, mid, low knobs
    this.eqHigh = new components.Pot({ group: "[EqualizerRack1_" + group + "_Effect1]", inKey: "parameter3" });
    this.eqMid = new components.Pot({ group: "[EqualizerRack1_" + group + "_Effect1]", inKey: "parameter2" });
    this.eqLow = new components.Pot({ group: "[EqualizerRack1_" + group + "_Effect1]", inKey: "parameter1" });

    // Pitch: simple pot to rate parameter (expects 0..1); wrappers convert CC value
    this.rate = new components.Pot({ group: group, inKey: "rate" });

    // Pitch Bend buttons: temporary pitch up/down
    this.pitchBendUpBtn = new components.Button({
        group: group,
        type: components.Button.prototype.types.push,
    });
    this.pitchBendUpBtn.normalInput = function(_ch,_ctrl,value,_status,group){
        engine.setValue(group, "rate_temp_up", this.isPress(_ch, _ctrl, value, _status) ? 1 : 0);
    };
    this.pitchBendUpBtn.shiftedInput = function(_ch,_ctrl,value,_status,group){
        engine.setValue(group, "fwd", this.isPress(_ch, _ctrl, value, _status) ? 1 : 0);
    };
    this.pitchBendUpBtn.altShiftInput = function(_ch, _ctrl, value, _status, group) {
        if (!this.isPress(_ch, _ctrl, value, _status)) return;
        engine.setValue(group, "beatjump_32_forward", 1);
    };
    // Function pointer for shift behavior
    this.pitchBendUpBtn.shiftFunction = this.pitchBendUpBtn.shiftedInput;
    this.pitchBendUpBtn.unshift = function() {
        this.input = this.normalInput;
    };
    this.pitchBendUpBtn.shift = function() {
        this.input = this.shiftFunction;
    };
    this.pitchBendUpBtn.unshift();

    // Pitch Bend Down Button
    this.pitchBendDownBtn = new components.Button({
        group: group,
        type: components.Button.prototype.types.push,
    });
    this.pitchBendDownBtn.normalInput = function(_ch,_ctrl,value,_status,group){
        engine.setValue(group, "rate_temp_down", this.isPress(_ch, _ctrl, value, _status) ? 1 : 0);
    };
    this.pitchBendDownBtn.shiftedInput = function(_ch,_ctrl,value,_status,group){
        engine.setValue(group, "back", this.isPress(_ch, _ctrl, value, _status) ? 1 : 0);
    };
    this.pitchBendDownBtn.altShiftInput = function(_ch, _ctrl, value, _status, group) {
        if (!this.isPress(_ch, _ctrl, value, _status)) return;
        engine.setValue(group, "beatjump_32_backward", 1);
    };
    
    // Function pointer for shift behavior
    this.pitchBendDownBtn.shiftFunction = this.pitchBendDownBtn.shiftedInput;
    this.pitchBendDownBtn.unshift = function() {
        this.input = this.normalInput;
    };
    this.pitchBendDownBtn.shift = function() {
        this.input = this.shiftFunction;
    };
    this.pitchBendDownBtn.unshift();

    // Method to swap shiftFunction between shiftedInput and altShiftInput
    this.pitchBendUpBtn.swapShiftFunction = function() {
        this.shiftFunction = (this.shiftFunction === this.shiftedInput)
            ? this.altShiftInput
            : this.shiftedInput;
    };
    this.pitchBendDownBtn.swapShiftFunction = function() {
        this.shiftFunction = (this.shiftFunction === this.shiftedInput)
            ? this.altShiftInput
            : this.shiftedInput;
    };

    // Beat Tap (tempo tap) button now belongs to the channel (deck) group
    //var channelGroup = (samplerNumber <= 4) ? "[Channel1]" : "[Channel2]";
    this.beatTapBtn = new components.Button({
        group: group,
        type: components.Button.prototype.types.push,     
    });

    // Assign persistent fxUnit property to beatTapBtn
    this.beatTapBtn.fxUnit = undefined; // to be set after FX units are built


    // Refactored beatTapBtn.input to use script.bpm.tapButton(deck)
    this.beatTapBtn.input = function(channel, control, value, status, group) {
        if (!this.isPress(channel, control, value, status)) return;
        if (MC2000.isShiftActive() && typeof this.shift === 'function') {
            this.shift();
        } else {
            MC2000.debugLog("Beat Tap button pressed on deck " + self.deckNumber);
            // Use deckNumber from this SamplerDeck instance
            console.log("TappButton type: " + typeof bpm.tapButton);
            if (typeof script !== 'undefined' && bpm.tapButton && typeof bpm.tapButton === 'function') {
                bpm.tapButton(self.deckNumber);
            } else {
                // Fallback to Mixxx engine bpm_tap
                engine.setValue(group, 'bpm_tap', 1);
                if (MC2000.debugMode) {
                    MC2000.debugLog('Fallback: engine.setValue("' + group + '", "bpm_tap", 1)');
                }
            }
        }
        
    };

    // beatTapBtn shift method to call fxunit increment sampler focus defined in fx unit   
    this.beatTapBtn.shift = function() {
       
        MC2000.debugLog("Beat Tap button shift pressed: changing sampler focus for deck " + self.deckNumber);
        var fxUnit = self.beatTapBtn.fxUnit;
        if (fxUnit && typeof fxUnit.incrementFocus === 'function') {
            fxUnit.incrementFocus(self.deckNumber);
        }
        if (MC2000.debugMode) MC2000.debugLog("Sampler focus set to " + (fxUnit ? fxUnit.focus : 'N/A'));
    };

        

    this.applyShiftState = function(shifted) {
        // List of all shift-capable components
        var shiftComponents = [
            this.play,
            this.cue,
            this.sync,
            this.keylock,
            this.jogWheel,
            this.loadTrackBtn,
            this.pitchBendUpBtn,
            this.pitchBendDownBtn,
            this.loopInBtn,
            this.loopOutBtn,
            this.loopHalveBtn,
            this.loopDoubleBtn,
            this.reloopExitBtn,
        ];
        // Apply shift/unshift to individual components
        shiftComponents.forEach(function(comp) {
            if (comp) {
                if (comp === self.fxWetDryEncoder) {
                    // Set input method based on shift state
                    comp.input = shifted ? comp.shiftedInput : comp.normalInput;
                } else {
                    if (shifted && comp.shift) {
                        comp.shift();
                    } else if (comp.unshift) {
                        comp.unshift();
                    }
                }
            }
        });
        // Apply shift/unshift to hotcue buttons
        if (this.hotcueButtons) {
            this.hotcueButtons.forEach(function(btn) {
                if (btn) {
                    if (shifted && btn.shift) {
                        btn.shift();
                    } else if (btn.unshift) {
                        btn.unshift();
                    }
                }
            });
        }
    };

    // --- Loops ---
    // Loop In: Sets loop in point, or activates 4-beat loop if no loop exists
    // Shift: Jump to loop in point
    this.loopInBtn = new components.Button({
        group: group,
        type: components.Button.prototype.types.push,
    });

    
    this.loopInBtn.normalInput = function(_ch,_ctrl,value,_status,group){
        if (!this.isPress(_ch, _ctrl, value, _status)) return;
        // Normal: Set loop in point, or activate beatloop if no loop
        var loopEnabled = engine.getValue(group, "loop_enabled");
        var loopStart = engine.getValue(group, "loop_start_position");
        
        if (loopStart === -1 && !loopEnabled) {
            // No loop exists: create 4-beat loop
            engine.setValue(group, "beatloop_4_activate", 1);
        } else {
            // Set loop in point
            engine.setValue(group, "loop_in", 1);
        }
    };
    this.loopInBtn.shiftedInput = function(_ch,_ctrl,value,_status,group){
        if (!this.isPress(_ch, _ctrl, value, _status)) return;
        // Shift: Jump to loop in point (if loop exists)
        var loopStart = engine.getValue(group, "loop_start_position");
        if (loopStart !== -1) {
            engine.setValue(group, "loop_in_goto", 1);
        }
    };
    this.loopInBtn.unshift = function() {
        this.input = this.normalInput;
    };
    this.loopInBtn.shift = function() {
        this.input = this.shiftedInput;
    };
    this.loopInBtn.unshift();
    this.loopInBtn.output = function(value) {
        MC2000.LedManager.reflect("loopin", value, {deck: self.deckNumber});
    };
    this.loopInBtn.connect = function() {
        engine.makeConnection(this.group, "loop_enabled", this.output.bind(this));
    };

    // Loop Out: Sets loop out point and activates loop
    // Shift: Jump to loop out point
    this.loopOutBtn = new components.Button({
        group: group,
        type: components.Button.prototype.types.push,
    });
    this.loopOutBtn.normalInput = function(_ch,_ctrl,value,_status,group){
        if (!this.isPress(_ch, _ctrl, value, _status)) return;
        // Normal: Set loop out point
        engine.setValue(group, "loop_out", 1);
    };
    this.loopOutBtn.shiftedInput = function(_ch,_ctrl,value,_status,group){
        if (!this.isPress(_ch, _ctrl, value, _status)) return;
        // Shift: Jump to loop out point (if loop exists)
        var loopEnd = engine.getValue(group, "loop_end_position");
        if (loopEnd !== -1) {
            engine.setValue(group, "loop_out_goto", 1);
        }
    };
    this.loopOutBtn.unshift = function() {
        this.input = this.normalInput;
    };
    this.loopOutBtn.shift = function() {
        this.input = this.shiftedInput;
    };
    this.loopOutBtn.unshift();
    this.loopOutBtn.output = function(value) {
        MC2000.LedManager.reflect("loopout", value, {deck: self.deckNumber});
    };
    this.loopOutBtn.connect = function() {
        engine.makeConnection(this.group, "loop_enabled", this.output.bind(this));
    };

    // Loop Halve: Halves the current loop size
    // Shift: Beatjump backward by 1 beat
    this.loopHalveBtn = new components.Button({
        group: group,
        type: components.Button.prototype.types.push,
    });
    this.loopHalveBtn.normalInput = function(_ch,_ctrl,value,_status,group){
        if (!this.isPress(_ch, _ctrl, value, _status)) return;
        engine.setValue(group, "loop_halve", 1);
    };
    this.loopHalveBtn.shiftedInput = function(_ch,_ctrl,value,_status,group){
        if (!this.isPress(_ch, _ctrl, value, _status)) return;
        engine.setValue(group, "beatjump_1_backward", 1);
    };
    this.loopHalveBtn.unshift = function() {
        this.input = this.normalInput;
    };
    this.loopHalveBtn.shift = function() {
        this.input = this.shiftedInput;
    };
    this.loopHalveBtn.unshift();

    // Loop Double: Doubles the current loop size
    // Shift: Beatjump forward by 1 beat
    this.loopDoubleBtn = new components.Button({
        group: group,
        type: components.Button.prototype.types.push,
    });
    this.loopDoubleBtn.normalInput = function(_ch,_ctrl,value,_status,group){
        if (!this.isPress(_ch, _ctrl, value, _status)) return;
        engine.setValue(group, "loop_double", 1);
    };
    this.loopDoubleBtn.shiftedInput = function(_ch,_ctrl,value,_status,group){
        if (!this.isPress(_ch, _ctrl, value, _status)) return;
        engine.setValue(group, "beatjump_1_forward", 1);
    };
    this.loopDoubleBtn.unshift = function() {
        this.input = this.normalInput;
    };
    this.loopDoubleBtn.shift = function() {
        this.input = this.shiftedInput;
    };
    this.loopDoubleBtn.unshift();

    // Reloop/Exit: Toggles loop on/off if loop exists, or creates beatloop if no loop
    // Shift: Creates 8-beat loop instead of 4-beat
    this.reloopExitBtn = new components.Button({
        group: group,
        type: components.Button.prototype.types.push,
    });
    this.reloopExitBtn.normalInput = function(_ch,_ctrl,value,_status,group){
        if (!this.isPress(_ch, _ctrl, value, _status)) return;
        var loopStart = engine.getValue(group, "loop_start_position");
        
        if (loopStart !== -1) {
            // Loop exists: toggle it (reloop/exit)
            engine.setValue(group, "reloop_toggle", 1);
        } else {
            // No loop: create 4-beat loop
            engine.setValue(group, "beatloop_4_activate", 1);
        }
    };
    this.reloopExitBtn.shiftedInput = function(_ch,_ctrl,value,_status,group){
        if (!this.isPress(_ch, _ctrl, value, _status)) return;
        var loopStart = engine.getValue(group, "loop_start_position");
        
        if (loopStart !== -1) {
            // Loop exists: toggle it (reloop/exit)
            engine.setValue(group, "reloop_toggle", 1);
        } else {
            // No loop: create 8-beat loop
            engine.setValue(group, "beatloop_8_activate", 1);
        }
    };
    this.reloopExitBtn.unshift = function() {
        this.input = this.normalInput;
    };
    this.reloopExitBtn.shift = function() {
        this.input = this.shiftedInput;
    };
    this.reloopExitBtn.unshift();
    this.reloopExitBtn.output = function(value) {
        MC2000.LedManager.reflect("autoloop", value, {deck: self.deckNumber});
    };
    this.reloopExitBtn.connect = function() {
        engine.makeConnection(this.group, "loop_enabled", this.output.bind(this));
    };

    // Hotcues: using HotcueButton components
    this.hotcueButtons = [];
    var ledNames = ["cue1", "cue2", "cue3", "cue4"];
    
    for (var i = 0; i < 4; i++) {
        // Create HotcueButton component
        this.hotcueButtons[i] = new components.HotcueButton({
            group: group,
            number: i + 1,
        });
        
        // Custom output for LED feedback
        (function(index, deckNum, ledName, hotcue) {
            hotcue.output = function(value) {
                MC2000.LedManager.reflect(ledName, value, {deck: deckNum});
            };
            
            hotcue.connect = function() {
                engine.makeConnection(this.group, "hotcue_" + this.number + "_enabled", this.output.bind(this));
            };
            
            // Store original input for shift layers
            hotcue.normalInput = hotcue.input;
            
            // Shifted input: clear hotcue
            hotcue.shiftedInput = function(channel, control, value, status, group) {
                if (this.isPress(channel, control, value, status)) {
                    var pos = engine.getValue(group, "hotcue_" + this.number + "_position");
                    if (pos !== -1) {
                        engine.setValue(group, "hotcue_" + this.number + "_clear", 1);
                    }
                }
                // No action on release in shift mode
            };
            
            hotcue.unshift = function() {
                this.input = this.normalInput;
            };
            
            hotcue.shift = function() {
                this.input = this.shiftedInput;
            };
            
            hotcue.unshift(); // Initialize
        }).call(this, i, self.deckNumber, ledNames[i], this.hotcueButtons[i]);
    }
    
    // Hotcue input handler
    this.hotcueInput = function(control, value, _status) {
        var n = MC2000.mapHotcue(control);
        if (n < 1 || n > 4 || !this.hotcueButtons[n - 1]) return;
        // Delegate to the hotcue button component (shift layers handled by component)
        this.hotcueButtons[n - 1].input(0, control, value, 0, group);
    };

    
};

MC2000.buildComponents = function() {
    MC2000.debugLog("Building components...");
    MC2000.decks = {
        "[Channel1]": new MC2000.Deck("[Channel1]"),
        "[Channel2]": new MC2000.Deck("[Channel2]")
    };
    MC2000.debugLog("Decks created");
    
    // Apply current shift state and connect LEDs
    Object.keys(MC2000.decks).forEach(function(g) {
        var d = MC2000.decks[g];
        d.applyShiftState(MC2000.isShiftActive());
        
        // Connect component LEDs
        if (d.play && d.play.connect) d.play.connect();
        if (d.cue && d.cue.connect) d.cue.connect();
        if (d.sync && d.sync.connect) d.sync.connect();
        if (d.keylock && d.keylock.connect) d.keylock.connect();
        if (d.pfl && d.pfl.connect) d.pfl.connect();
        if (d.sampleModeToggle && d.sampleModeToggle.connect) d.sampleModeToggle.connect();
        if (d.loopInBtn && d.loopInBtn.connect) d.loopInBtn.connect();
        if (d.loopOutBtn && d.loopOutBtn.connect) d.loopOutBtn.connect();
        if (d.reloopExitBtn && d.reloopExitBtn.connect) d.reloopExitBtn.connect();
        
        // Connect hotcue button LEDs
        if (d.hotcueButtons) {
            for (var i = 0; i < d.hotcueButtons.length; i++) {
                if (d.hotcueButtons[i] && d.hotcueButtons[i].connect) {
                    d.hotcueButtons[i].connect();
                }
            }
        }
        MC2000.debugLog(g + " components connected");
    });
    MC2000.debugLog("buildComponents complete");
};

//helper to get deck index from group name
MC2000.deckIndex = function(group) {
    if (group === "[Channel1]") return 1;
    if (group === "[Channel2]") return 2;
    return 1;
};

//////////////////////////////
// Transport handlers       //
// All handlers below are wrapper functions that delegate to deck components
// for proper encapsulation and component-based architecture
//////////////////////////////
MC2000.playButton = function(channel, control, value, status, group) {
    MC2000.decks[group].play.input(channel, control, value, status, group);
};

MC2000.cueButton = function(channel, control, value, status, group) {
   MC2000.decks[group].cue.input(channel, control, value, status, group);
};

MC2000.syncButton = function(channel, control, value, status, group) {
    //MC2000.decks[group].applyShiftState(MC2000.isShiftActive());
    MC2000.decks[group].sync.input(channel, control, value, status, group);
};

MC2000.keylockButton = function(channel, control, value, status, group) {
    MC2000.decks[group].keylock.input(channel, control, value, status, group);
};

MC2000.vinylModeButton = function(channel, control, value, status, group) {
    MC2000.decks[group].vinylMode.input(channel, control, value, status, group);
};

MC2000.pflButton = function(channel, control, value, status, group) {
    var wasPressed = MC2000.isButtonOn(value);
    // If shift is held and PFL is pressed, toggle shift lock
    if (wasPressed && MC2000.shiftHeld) {
        MC2000.shiftLock = !MC2000.shiftLock;
        MC2000.updateShiftState();
        //MC2000.blinkShiftLock(); // Blink for feedback
        if (MC2000.debugMode) MC2000.debugLog("Shift lock " + (MC2000.shiftLock ? "ENABLED" : "DISABLED"));
        return;
    }
    // Otherwise, normal PFL logic
    MC2000.decks[group].pfl.input(channel, control, value, status, group);
};

//////////////////////////////
// Sample Mode Toggle       //
//////////////////////////////
MC2000.sampleModeToggle = function(channel, control, value, status, group) {
    MC2000.decks[group].sampleModeToggle.input(channel, control, value, status, group);
};

//////////////////////////////
// Load Track               //
//////////////////////////////
MC2000.loadTrack = function(channel, control, value, status, group) {
    MC2000.decks[group].loadTrackBtn.input(channel, control, value, status, group);
};

//////////////////////////////
// Track Gain knob          //
//////////////////////////////
MC2000.trackGain = function(channel, control, value, status, group) {
    MC2000.decks[group].trackGain.input(channel, control, value, status, group);
};

//////////////////////////////
// Volume fader             //
//////////////////////////////
MC2000.volumeFader = function(channel, control, value, status, group) {
    MC2000.decks[group].volume.input(channel, control, value, status, group);
};

//////////////////////////////
// EQ controls              //
//////////////////////////////
MC2000.eqHigh = function(channel, control, value, status, group) {
    MC2000.decks[group].eqHigh.input(channel, control, value, status, group);
};

MC2000.eqMid = function(channel, control, value, status, group) {
    MC2000.decks[group].eqMid.input(channel, control, value, status, group);
};

MC2000.eqLow = function(channel, control, value, status, group) {
    MC2000.decks[group].eqLow.input(channel, control, value, status, group);
};

//////////////////////////////
// Master Controls          //
//////////////////////////////
MC2000.masterVolume = function(channel, control, value, status, group) {
    MC2000.masterVolumePot.input(channel, control, value, status, group);
};

MC2000.crossfader = function(channel, control, value, status, group) {
    MC2000.crossfaderPot.input(channel, control, value, status, group);
};

MC2000.headphoneVolume = function(channel, control, value, status, group) {
    MC2000.headphoneVolumePot.input(channel, control, value, status, group);
};

MC2000.headphoneMix = function(channel, control, value, status, group) {
    MC2000.headphoneMixPot.input(channel, control, value, status, group);
};

//////////////////////////////
// Pitch fader (absolute)   //
//////////////////////////////
MC2000.pitchFader = function(channel, control, value, status, group) {
    MC2000.decks[group].rate.input(channel, control, value, status, group);
};

//////////////////////////////
// Pitch Bend buttons       //
//////////////////////////////
MC2000.pitchBendUp = function(channel, control, value, status, group) {
    MC2000.decks[group].pitchBendUpBtn.input(channel, control, value, status, group);
};

MC2000.pitchBendDown = function(channel, control, value, status, group) {
    MC2000.decks[group].pitchBendDownBtn.input(channel, control, value, status, group);
};

//////////////////////////////
// Beat Tap (tempo tap)     //
//////////////////////////////
MC2000.beatTap1 = function(channel, control, value, status, group) {
    MC2000.decks["[Channel1]"].beatTapBtn.input(channel, control, value, status, "[Channel1]");
};
MC2000.beatTap2 = function(channel, control, value, status, group) {
    MC2000.decks["[Channel2]"].beatTapBtn.input(channel, control, value, status, "[Channel2]");
};




//////////////////////////////
// Hotcues (single pad demo)//
//////////////////////////////
MC2000.hotcuePad = function(channel, control, value, status, group) {
    var d = MC2000.decks[group];
    if (d && d.hotcueInput) {
        d.hotcueInput(control, value, status);
    }
};

MC2000.mapHotcue = function(midino) {
    // Map MIDI note numbers to hotcue indices (1-4 per deck)
    var table = {
        0x17: 1,
        0x18: 2,
        0x19: 3,
        0x20: 4
    };
    return table[midino] || -1;
};

//////////////////////////////
// Loop handlers            //
//////////////////////////////
MC2000.loopIn = function(channel, control, value, status, group) {
    MC2000.decks[group].loopInBtn.input(channel, control, value, status, group);
};

MC2000.loopOut = function(channel, control, value, status, group) {
    MC2000.decks[group].loopOutBtn.input(channel, control, value, status, group);
};

MC2000.reloopExit = function(channel, control, value, status, group) {
    MC2000.decks[group].reloopExitBtn.input(channel, control, value, status, group);
};

MC2000.loopHalve = function(channel, control, value, status, group) {
    MC2000.decks[group].loopHalveBtn.input(channel, control, value, status, group);
};

MC2000.loopDouble = function(channel, control, value, status, group) {
    MC2000.decks[group].loopDoubleBtn.input(channel, control, value, status, group);
};

//////////////////////////////
// FX Unit Handlers         //
//////////////////////////////
// Generic FX effect toggle handler
MC2000.fxEffectToggle = function(unitNum, effectNum, channel, control, value, status, group) {
    MC2000.fxUnits[unitNum].effects[effectNum].toggle.input(channel, control, value, status, group);
};

// Generic FX effect meta handler
MC2000.fxEffectMeta = function(unitNum, effectNum, channel, control, value, status, group) {
    MC2000.fxUnits[unitNum].effects[effectNum].meta.input(channel, control, value, status, group);
};

// Generic FX wet/dry handler
MC2000.fxWetDry = function(unitNum, channel, control, value, status, group) {
    MC2000.fxUnits[unitNum].wetDryEncoder.input(channel, control, value, status, group);
};

// Unit 1 - Effect toggles
MC2000.fx1_effect1_toggle = function(channel, control, value, status, group) {
    MC2000.fxEffectToggle(1, 1, channel, control, value, status, group);
};
MC2000.fx1_effect2_toggle = function(channel, control, value, status, group) {
    MC2000.fxEffectToggle(1, 2, channel, control, value, status, group);
};
MC2000.fx1_effect3_toggle = function(channel, control, value, status, group) {
    MC2000.fxEffectToggle(1, 3, channel, control, value, status, group);
};

// Unit 1 - Effect meta pots
MC2000.fx1_effect1_meta = function(channel, control, value, status, group) {
    MC2000.fxEffectMeta(1, 1, channel, control, value, status, group);
};
MC2000.fx1_effect2_meta = function(channel, control, value, status, group) {
    MC2000.fxEffectMeta(1, 2, channel, control, value, status, group);
};
MC2000.fx1_effect3_meta = function(channel, control, value, status, group) {
    MC2000.fxEffectMeta(1, 3, channel, control, value, status, group);
};

// Unit 2 - Effect toggles
MC2000.fx2_effect1_toggle = function(channel, control, value, status, group) {
    MC2000.fxEffectToggle(2, 1, channel, control, value, status, group);
};
MC2000.fx2_effect2_toggle = function(channel, control, value, status, group) {
    MC2000.fxEffectToggle(2, 2, channel, control, value, status, group);
};
MC2000.fx2_effect3_toggle = function(channel, control, value, status, group) {
    MC2000.fxEffectToggle(2, 3, channel, control, value, status, group);
};

// Unit 2 - Effect meta pots
MC2000.fx2_effect1_meta = function(channel, control, value, status, group) {
    MC2000.fxEffectMeta(2, 1, channel, control, value, status, group);
};
MC2000.fx2_effect2_meta = function(channel, control, value, status, group) {
    MC2000.fxEffectMeta(2, 2, channel, control, value, status, group);
};
MC2000.fx2_effect3_meta = function(channel, control, value, status, group) {
    MC2000.fxEffectMeta(2, 3, channel, control, value, status, group);
};

// Unit wet/dry encoders
MC2000.fx1_wetDry = function(channel, control, value, status, group) {
    MC2000.fxWetDry(1, channel, control, value, status, group);
};
MC2000.fx2_wetDry = function(channel, control, value, status, group) {
    MC2000.fxWetDry(2, channel, control, value, status, group);
};

//////////////////////////////
// Library handlers         //
//////////////////////////////
MC2000.ScrollVertical = function(channel, control, value, status, group) {
    MC2000.scrollVerticalEncoder.input(channel, control, value, status, group);
};

MC2000.libraryFocusForwardBtn = function(channel, control, value, status, group) {
    
    MC2000.libraryFocusForwardComp.input(channel, control, value, status, group);
};

MC2000.libraryFocusBackwardBtn = function(channel, control, value, status, group) {
    
    MC2000.libraryFocusBackwardComp.input(channel, control, value, status, group);
};

MC2000.libraryGoToItemBtn = function(channel, control, value, status, group) {
    
    MC2000.libraryGoToItemComp.input(channel, control, value, status, group);
};

// Thin wrapper for XML mapping
MC2000.libraryPreviewButton = function(channel, control, value, status, group) {
    
    MC2000.previewDeck.playButton.input(channel, control, value, status, group);
    
};




//////////////////////////////
// Sampler handlers         //
//////////////////////////////
// MIDI note to sampler number mapping
MC2000.samplerMidiMap = {
    // Bank 1 (Deck 1 - channel 0x90)
    0x21: 1,
    0x22: 2,
    0x23: 3,
    0x24: 4,
    // Bank 2 (Deck 2 - channel 0x91)
    0x31: 5,
    0x32: 6,
    0x33: 7,
    0x34: 8
};

// Generic handler using MIDI note lookup
MC2000.samplerPlayButtonGeneric = function(channel, control, value, status) {
    var samplerNum = MC2000.samplerMidiMap[control];
    if (!samplerNum) {
        if (MC2000.debugMode) MC2000.debugLog("Unknown sampler MIDI note: 0x" + control.toString(16));
        return;
    }
    var group = "[Sampler" + samplerNum + "]";
    // Only act on button press (ignore release/off)
    if (!MC2000.isButtonOn(value)) return;

    // Shift: Eject/unload sampler if track is loaded
    if (MC2000.isShiftActive()) {
        var loaded = engine.getValue(group, "track_loaded");
        if (loaded === 1) {
            engine.setValue(group, "eject", 1);
            if (MC2000.debugMode) MC2000.debugLog("Sampler" + samplerNum + ": ejected track");
        }
        return;
    }

    // Normal behavior: If sampler empty, load selected library track (but don't play yet)
    var loaded = engine.getValue(group, "track_loaded");
    if (loaded === 0) {
        engine.setValue(group, "LoadSelectedTrack", 1);
        if (MC2000.debugMode) MC2000.debugLog("Sampler" + samplerNum + ": loaded selected track (not playing yet)");
        return;
    }

    // If track is loaded, delegate to play button for play/stop logic
    MC2000.samplers[samplerNum].playButton.input(channel, control, value, status, group);
};

// Individual handlers for XML bindings (delegate to generic handler)
MC2000.sampler1PlayButton = function(channel, control, value, status, group) {
    MC2000.samplerPlayButtonGeneric(channel, control, value, status);
};
MC2000.sampler2PlayButton = function(channel, control, value, status, group) {
    MC2000.samplerPlayButtonGeneric(channel, control, value, status);
};
MC2000.sampler3PlayButton = function(channel, control, value, status, group) {
    MC2000.samplerPlayButtonGeneric(channel, control, value, status);
};
MC2000.sampler4PlayButton = function(channel, control, value, status, group) {
    MC2000.samplerPlayButtonGeneric(channel, control, value, status);
};
MC2000.sampler5PlayButton = function(channel, control, value, status, group) {
    MC2000.samplerPlayButtonGeneric(channel, control, value, status);
};
MC2000.sampler6PlayButton = function(channel, control, value, status, group) {
    MC2000.samplerPlayButtonGeneric(channel, control, value, status);
};
MC2000.sampler7PlayButton = function(channel, control, value, status, group) {
    MC2000.samplerPlayButtonGeneric(channel, control, value, status);
};
MC2000.sampler8PlayButton = function(channel, control, value, status, group) {
    MC2000.samplerPlayButtonGeneric(channel, control, value, status);
};

//////////////////////////////
// Debug utilities          //
//////////////////////////////
// Dump current controller state for debugging
MC2000.debugDump = function() {
    MC2000.log("=== MC2000 Debug Dump ===");
    MC2000.log("Shift held: " + MC2000.shiftHeld + ", lock: " + MC2000.shiftLock + ", effective: " + MC2000.isShiftActive());
    MC2000.log("Debug mode: " + MC2000.debugMode);
    MC2000.log("Decks initialized: " + (MC2000.decks ? "Yes" : "No"));
    MC2000.log("FX units initialized: " + (MC2000.fxUnits ? "Yes" : "No"));
    MC2000.log("Samplers initialized: " + (MC2000.samplers ? "Yes" : "No"));
};

//////////////////////////////
// TODO / Future Features   //
//////////////////////////////
// PRIORITY:
// - Verify all MIDI codes against hardware
// - Test and fix LED feedback issues
// - Complete jog wheel/scratch implementation
// - Tune encoder sensitivities
//
// ENHANCEMENTS:
// - Sampler deck controls (basic scaffolding added)
// - Advanced shift layers for alternate pad modes
// - Smart PFL auto-enable logic
// - Rate range cycling
// - Beat jump controls
// - Loop roll controls
// - Performance mode improvements

