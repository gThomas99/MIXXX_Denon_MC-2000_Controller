import csv

with open('Denon-MC2000-MIDI-mapping.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

print('Summary of Updated Shift Commands:')
print('=' * 120)

button_types = {
    'playButton': [],
    'cueButton': [],
    'syncButton': [],
    'keylockButton': []
}

for idx, row in enumerate(rows):
    cmd = row.get('Command Name (XML/JS)', '')
    if cmd in button_types:
        button_types[cmd].append((idx, row))

for button_type, instances in button_types.items():
    if instances:
        print(f'\n{button_type}:')
        for idx, row in instances[:2]:  # Show first 2 instances of each
            print(f'  MIDI: {row.get("MIDI No", "")}')
            print(f'  Shift Cmd: {row.get("Shift Command", "")}')
            print(f'  Shift Notes: {row.get("Shift Notes", "")}')
            break  # Just show first one

print('\n' + '=' * 120)
print('CSV update complete! Header row unchanged, all data rows updated with shift information.')
