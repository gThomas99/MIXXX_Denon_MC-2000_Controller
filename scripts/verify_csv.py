import csv

with open('Denon-MC2000-MIDI-mapping.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

# Show specific key rows that were updated
print('Updated Key Rows from CSV:')
print('=' * 120)

key_commands = ['playButton', 'cueButton', 'syncButton', 'keylockButton', 'hotcuePad']
count = 0

for idx, row in enumerate(rows):
    cmd = row.get('Command Name (XML/JS)', '')
    if cmd in key_commands and count < 7:
        print(f'Row {idx}: {cmd}')
        print(f'  Mixxx Control: {row.get("Mixxx Control", "")}')
        print(f'  Shift Command: {row.get("Shift Command", "")}')
        print(f'  Shift Notes: {row.get("Shift Notes", "")}')
        print()
        count += 1
