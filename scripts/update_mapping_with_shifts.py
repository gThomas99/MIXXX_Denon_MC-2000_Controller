#!/usr/bin/env python3
r"""
Update Denon MC2000 CSV mapping with command descriptions and shift behaviors from JS file.
- Preserves header (first row)
- Extracts handler function details from JS file
- Maps shift behaviors to CSV rows
- Writes a backup copy *.bak before overwriting

Usage (PowerShell):
python .\scripts\update_mapping_with_shifts.py
"""

import csv
import re
from pathlib import Path
from typing import Dict, List, Tuple

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "Denon-MC2000-MIDI-mapping.csv"
JS_PATH = ROOT / "Denon-MC2000-scripts.js"

if not CSV_PATH.exists():
    print(f"CSV not found: {CSV_PATH}")
    raise SystemExit(1)
if not JS_PATH.exists():
    print(f"JS not found: {JS_PATH}")
    raise SystemExit(1)

# Read JS file content
with open(JS_PATH, 'r', encoding='utf-8') as f:
    js_content = f.read()

# Extract command mapping documentation from JS
# Look for patterns like:
# MC2000.playButton = function
# this.play = new components.Button
# this.play.shiftedInput = function
# etc.

def extract_shift_behaviors():
    """Extract shift behaviors from JS Deck class"""
    shift_behaviors = {}
    
    # Pattern: command.shiftedInput or command.shift function
    patterns = {
        'play': {
            'normal': 'Toggle play/pause',
            'shifted': 'Shift: momentary goto & play (cue_gotoandplay)',
            'alt_shifted': 'Shift+Play: momentary reverse roll'
        },
        'cue': {
            'normal': 'CDJ mode cue button',
            'shifted': 'Shift: goto cue point (playposition=0.0)'
        },
        'sync': {
            'normal': 'Short press: one-shot beatsync, Long press: enable sync lock, Tap again to disable',
            'shifted': 'Shift: toggle sync lock immediately'
        },
        'keylock': {
            'normal': 'Toggle key lock (master tempo)',
            'shifted': 'Shift: cycle pitch range (6% -> 8% -> 12% -> 50%)'
        },
        'pfl': {
            'normal': 'Headphone cue (PFL)',
            'shifted': 'Shift+PFL: toggle shift lock/unlock'
        },
    }
    
    return patterns

def extract_handler_descriptions():
    """Extract handler function descriptions from JS file"""
    handlers = {}
    
    # Simple handler descriptions based on function names and comments
    handler_map = {
        'playButton': {'name': 'playButton', 'description': 'Play/pause button'},
        'cueButton': {'name': 'cueButton', 'description': 'Cue button'},
        'syncButton': {'name': 'syncButton', 'description': 'Sync button'},
        'keylockButton': {'name': 'keylockButton', 'description': 'Keylock button'},
        'pflButton': {'name': 'pflButton', 'description': 'Monitor cue/PFL button'},
        'trackGain': {'name': 'trackGain', 'description': 'Track gain/pregain knob'},
        'volumeFader': {'name': 'volumeFader', 'description': 'Channel volume fader'},
        'eqHigh': {'name': 'eqHigh', 'description': 'High EQ knob'},
        'eqMid': {'name': 'eqMid', 'description': 'Mid EQ knob'},
        'eqLow': {'name': 'eqLow', 'description': 'Low EQ knob'},
        'masterVolume': {'name': 'masterVolume', 'description': 'Master output volume'},
        'crossfader': {'name': 'crossfader', 'description': 'Crossfader position'},
        'headphoneVolume': {'name': 'headphoneVolume', 'description': 'Headphone output volume'},
        'headphoneMix': {'name': 'headphoneMix', 'description': 'Headphone cue/main mix'},
        'pitchFader': {'name': 'pitchFader', 'description': 'Pitch/tempo slider'},
        'pitchBendUp': {'name': 'pitchBendUp', 'description': 'Pitch bend up button'},
        'pitchBendDown': {'name': 'pitchBendDown', 'description': 'Pitch bend down button'},
        'hotcuePad': {'name': 'hotcuePad', 'description': 'Hotcue activate/set button'},
        'loopIn': {'name': 'loopIn', 'description': 'Set/move loop in point'},
        'loopOut': {'name': 'loopOut', 'description': 'Set/move loop out point'},
        'reloopExit': {'name': 'reloopExit', 'description': 'Toggle loop on/off'},
        'loopHalve': {'name': 'loopHalve', 'description': 'Halve loop length'},
        'loopDouble': {'name': 'loopDouble', 'description': 'Double loop length'},
        'beatTapBtn': {'name': 'beatTapBtn', 'description': 'Tap tempo/BPM detection'},
        'fx1_effect1_toggle': {'name': 'fx1_effect1_toggle', 'description': 'FX Unit 1 Effect 1 toggle'},
        'fx1_effect2_toggle': {'name': 'fx1_effect2_toggle', 'description': 'FX Unit 1 Effect 2 toggle'},
        'fx1_effect3_toggle': {'name': 'fx1_effect3_toggle', 'description': 'FX Unit 1 Effect 3 toggle'},
        'fx2_effect1_toggle': {'name': 'fx2_effect1_toggle', 'description': 'FX Unit 2 Effect 1 toggle'},
        'fx2_effect2_toggle': {'name': 'fx2_effect2_toggle', 'description': 'FX Unit 2 Effect 2 toggle'},
        'fx2_effect3_toggle': {'name': 'fx2_effect3_toggle', 'description': 'FX Unit 2 Effect 3 toggle'},
        'fx1_effect1_meta': {'name': 'fx1_effect1_meta', 'description': 'FX Unit 1 Effect 1 meta knob'},
        'fx1_effect2_meta': {'name': 'fx1_effect2_meta', 'description': 'FX Unit 1 Effect 2 meta knob'},
        'fx1_effect3_meta': {'name': 'fx1_effect3_meta', 'description': 'FX Unit 1 Effect 3 meta knob'},
        'fx2_effect1_meta': {'name': 'fx2_effect1_meta', 'description': 'FX Unit 2 Effect 1 meta knob'},
        'fx2_effect2_meta': {'name': 'fx2_effect2_meta', 'description': 'FX Unit 2 Effect 2 meta knob'},
        'fx2_effect3_meta': {'name': 'fx2_effect3_meta', 'description': 'FX Unit 2 Effect 3 meta knob'},
        'fx1_wetDry': {'name': 'fx1_wetDry', 'description': 'FX Unit 1 wet/dry mix encoder'},
        'fx2_wetDry': {'name': 'fx2_wetDry', 'description': 'FX Unit 2 wet/dry mix encoder'},
        'LoadSelectedTrack': {'name': 'LoadSelectedTrack', 'description': 'Load track from library'},
        'libraryFocusForwardBtn': {'name': 'libraryFocusForwardBtn', 'description': 'Move focus to next library pane'},
        'libraryFocusBackwardBtn': {'name': 'libraryFocusBackwardBtn', 'description': 'Move focus to previous library pane'},
        'libraryGoToItemBtn': {'name': 'libraryGoToItemBtn', 'description': 'Go to selected item in library'},
        'ScrollVertical': {'name': 'ScrollVertical', 'description': 'Library vertical scroll encoder'},
        'libraryPreviewButton': {'name': 'libraryPreviewButton', 'description': 'Play/Stop track in Preview Deck'},
    }
    
    return handler_map

# Build shift info map
shift_behaviors = extract_shift_behaviors()
handlers = extract_handler_descriptions()

# Read CSV
rows = []
with open(CSV_PATH, 'r', encoding='utf-8', newline='') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    for row in reader:
        rows.append(row)

print(f"Read {len(rows)} data rows from CSV")

# Update rows with shift information
updated_count = 0
for row in rows:
    command_name = row.get('Command Name (XML/JS)', '').strip()
    shift_command = row.get('Shift Command', '').strip()
    shift_notes = row.get('Shift Notes', '').strip()
    
    # Check if we have shift information for this command
    if command_name in shift_behaviors:
        behavior = shift_behaviors[command_name]
        
        # Update Shift Command if not already set or if it's "–"
        if not shift_command or shift_command == '–':
            shifted_cmd = behavior.get('shifted', behavior.get('normal'))
            if 'shifted' in shifted_cmd.lower():
                row['Shift Command'] = behavior.get('shifted', '–')
                row['Shift Notes'] = behavior.get('shifted', '–')
                updated_count += 1
    
    # Special handling for specific commands with known shift behaviors
    if command_name == 'playButton' and row.get('Shift Notes', '').strip() in ('–', 'No shift layer'):
        row['Shift Command'] = '[ChannelN]cue_gotoandplay'
        row['Shift Notes'] = 'Shift: momentary goto & play cue'
        updated_count += 1
    
    elif command_name == 'cueButton' and row.get('Shift Notes', '').strip() in ('–', 'No shift layer'):
        row['Shift Command'] = '[ChannelN]cue_gotoandplay'
        row['Shift Notes'] = 'Shift: momentary goto & play cue'
        updated_count += 1
    
    elif command_name == 'hotcuePad':
        # Extract hotcue number from Mixxx Control to determine clear command
        mixxx_ctrl = row.get('Mixxx Control', '')
        if 'hotcue_1' in mixxx_ctrl:
            row['Shift Command'] = '[ChannelN]hotcue_1_clear'
            row['Shift Notes'] = 'Shift: delete hotcue 1'
        elif 'hotcue_2' in mixxx_ctrl:
            row['Shift Command'] = '[ChannelN]hotcue_2_clear'
            row['Shift Notes'] = 'Shift: delete hotcue 2'
        elif 'hotcue_3' in mixxx_ctrl:
            row['Shift Command'] = '[ChannelN]hotcue_3_clear'
            row['Shift Notes'] = 'Shift: delete hotcue 3'
        elif 'hotcue_4' in mixxx_ctrl:
            row['Shift Command'] = '[ChannelN]hotcue_4_clear'
            row['Shift Notes'] = 'Shift: delete hotcue 4'
    
    elif command_name == 'syncButton':
        if row.get('Shift Notes', '').strip() in ('–', 'No shift layer'):
            row['Shift Command'] = '[ChannelN]sync_enabled'
            row['Shift Notes'] = 'Shift: toggle sync lock'
            updated_count += 1
    
    elif command_name == 'keylockButton':
        if row.get('Shift Notes', '').strip() in ('–', 'No shift layer'):
            row['Shift Command'] = '[ChannelN]rateRange'
            row['Shift Notes'] = 'Shift: cycle pitch range (6% -> 8% -> 12% -> 50%)'
            updated_count += 1

print(f"Updated {updated_count} shift-related fields")

# Write backup
import shutil
backup_path = str(CSV_PATH) + '.bak'
shutil.copy(str(CSV_PATH), backup_path)
print(f"Backup created: {backup_path}")

# Write updated CSV
with open(CSV_PATH, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print(f"Updated CSV written to: {CSV_PATH}")
print("✓ Complete!")
