#!/usr/bin/env python3
"""
Update Denon MC2000 CSV mapping's "Command Name (XML/JS)" column using keys from the XML mapping.
- Preserves header (first row) and order.
- Writes a backup copy `*.bak` before overwriting.

Usage (PowerShell):
python .\scripts\update_mapping_csv.py

"""
import csv
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "Denon-MC2000-MIDI-mapping.csv"
XML_PATH = ROOT / "Denon-MC2000.midi.xml"

if not CSV_PATH.exists():
    print(f"CSV not found: {CSV_PATH}")
    raise SystemExit(1)
if not XML_PATH.exists():
    print(f"XML not found: {XML_PATH}")
    raise SystemExit(1)

# Parse XML and build mapping of STATUS-MIDINO -> key
# XML <status> and <midino> look like 0xB0 and 0x56
try:
    tree = ET.parse(str(XML_PATH))
    root = tree.getroot()
except Exception as e:
    print(f"Failed to parse XML: {e}")
    raise

namespace = None
mapping = {}

for control in root.findall('.//control'):
    key_elem = control.find('key')
    status_elem = control.find('status')
    midino_elem = control.find('midino')
    if key_elem is None or status_elem is None or midino_elem is None:
        continue
    key = key_elem.text.strip() if key_elem.text else ''
    status = status_elem.text.strip() if status_elem.text else ''
    midino = midino_elem.text.strip() if midino_elem.text else ''

    # Normalize hex representation: try to parse 0x.. or plain hex
    def norm_hex(s):
        s = s.strip()
        if s.lower().startswith('0x'):
            s = s[2:]
        # Remove potential leading 0x in other forms
        s = s.upper()
        # Ensure two-digit hex
        if len(s) == 1:
            s = '0' + s
        return s

    try:
        s_hex = norm_hex(status)
        m_hex = norm_hex(midino)
    except Exception:
        continue

    midi_no = f"{s_hex}-{m_hex}"
    # Strip leading MC2000. prefix if present
    if key.startswith('MC2000.'):
        key_out = key[len('MC2000.'):]
    else:
        key_out = key

    # Keep first occurrence
    if midi_no not in mapping:
        mapping[midi_no] = key_out

print(f"Parsed {len(mapping)} xml mappings from {XML_PATH.name}")

# Read CSV and update Command Name (4th column)
with CSV_PATH.open('r', newline='', encoding='utf-8') as f:
    text = f.read()

# Detect if file has fenced ```csv block (some editors included fences); strip if present
has_fence = False
lines = text.splitlines()
if len(lines) >= 1 and lines[0].strip().startswith('```'):
    has_fence = True
    # find fence end
    try:
        end_idx = lines.index('```', 1)
    except ValueError:
        print('Malformed fenced file; cannot find closing ```')
        raise SystemExit(1)
    csv_lines = lines[1:end_idx]
else:
    csv_lines = lines

# Use csv module to parse
reader = list(csv.reader(csv_lines))
if not reader:
    print('CSV appears empty')
    raise SystemExit(1)

header = reader[0]
# Find index of Command Name column (case-insensitive)
col_name = 'Command Name (XML/JS)'
try:
    cmd_idx = [h.strip() for h in header].index(col_name)
except ValueError:
    # fallback to 3rd index if exact header not found
    cmd_idx = 3

out_rows = [header]
updated = 0
for row in reader[1:]:
    # Skip empty rows
    if not any(cell.strip() for cell in row):
        out_rows.append(row)
        continue
    # Ensure row has enough columns
    while len(row) <= cmd_idx:
        row.append('')
    midi_no = row[2].strip() if len(row) > 2 else ''
    midi_no_norm = midi_no.upper()
    if midi_no_norm in mapping:
        new_cmd = mapping[midi_no_norm]
        if row[cmd_idx] != new_cmd:
            row[cmd_idx] = new_cmd
            updated += 1
    out_rows.append(row)

# Backup original
backup = CSV_PATH.with_suffix('.csv.bak')
backup.write_text(text, encoding='utf-8')
print(f"Backup written to {backup.name}")

# Reconstruct output text, preserving fences if present
import io
buf = io.StringIO()
writer = csv.writer(buf)
for r in out_rows:
    writer.writerow(r)
out_text = buf.getvalue().splitlines()
if has_fence:
    out_full = ['```csv'] + out_text + ['```', '']
else:
    out_full = out_text

CSV_PATH.write_text('\n'.join(out_full), encoding='utf-8')
print(f"Updated CSV written to {CSV_PATH.name} ({updated} rows changed)")
print('Done.')
