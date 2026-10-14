// Sample installation for the trainer: zones, loop units and the supplementary
// text the panel shows for each address.
//
// Location texts follow a tanker's builder address list (15 zones on 3 loops).
// The detector TYPES are assigned here for training only - check the real
// address list on board before relying on any of them.

// [zone, zone name, loop, first address, texts in address order]
const BUILDER = [
  [1, 'NAV. BRIDGE', 1, 1, ['BRIDGE CONTROL CONSOLE', 'BRIDGE CONTROL CONSOLE']],
  [2, 'C-DECK', 1, 11, [
    "C-DECK PASSAGE ST'BD", "C-DECK PASSAGE ST'BD", "C-DECK PASSAGE ST'BD",
    "C-DECK C/OFF.'S BED RM", "C-DECK C/OFF.'S DAY RM", "C-DECK CAPTAIN'S DAY RM",
    "C-DECK CAPTAIN'S BED RM", 'C-DECK JUNIOR(3)', 'C-DECK PILOT', 'C-DECK PASSAGE PORT',
    'C-DECK JUNIOR(2)', "C-DECK C/ENG.'S BED RM", "C-DECK C/ENG.'S DAY RM",
    "C-DECK 1ST ENG.'S DAY RM", "C-DECK 1ST ENG.'S BED RM", 'C-DECK PASSAGE PORT',
    'C-DECK PASSAGE PORT', 'C-DECK JUNIOR(1)', 'C-DECK JUNIOR(4)', 'C-DECK DUCT & C/TRUNK',
  ]],
  [3, 'B-DECK', 1, 41, [
    "B-DECK PASSAGE ST'BD", "B-DECK PASSAGE ST'BD", "B-DECK PASSAGE ST'BD",
    'B-DECK CREW(12)', 'B-DECK CREW(11)', 'B-DECK PETTY(3)', 'B-DECK CREW(10)',
    'B-DECK CREW(9)', 'B-DECK CREW(8)', 'B-DECK PASSAGE PORT', 'B-DECK CREW(7)',
    'B-DECK CREW(6)', 'B-DECK PETTY(2)', 'B-DECK CREW(5)', 'B-DECK CREW(4)',
    'B-DECK PASSAGE PORT', 'B-DECK PASSAGE PORT', 'B-DECK PETTY(1)', 'B-DECK DUCT & C/TRUNK',
  ]],
  [4, 'A-DECK', 1, 71, [
    'A-DECK PASSAGE CENTER', "A-DECK PASSAGE ST'BD", "A-DECK OFFICER'S MESS RM",
    "A-DECK EM'CY GEN. RM", "A-DECK EM'CY GEN. RM", "A-DECK PASSAGE ST'BD",
    "A-DECK OFFICER'S SMOKING RM", 'A-DECK DECK OFFICE', 'A-DECK CARGO CONT. RM',
    'A-DECK ENGINE OFFICE', "A-DECK CREW'S SMOKING RM", 'A-DECK PASSAGE PORT',
    'A-DECK PASSAGE PORT', "A-DECK CREW'S MESS RM", 'A-DECK GALLEY', 'A-DECK GALLEY',
    'A-DECK DUCT & C/TRUNK',
  ]],
  [5, 'UPPER DECK', 1, 91, [
    'UPP-DECK AIR COND. RM', 'UPP-DECK GYMNASIUM', "UPP-DECK PASSAGE ST'BD",
    'UPP-DECK CREW(3)', "UPP-DECK PASSAGE ST'BD", 'UPP-DECK PASSAGE CENTER',
    'UPP-DECK FIRE CONT. STATION', 'UPP-DECK PASSAGE PORT', 'UPP-DECK CREW(2)',
    'UPP-DECK CREW(1)', 'UPP-DECK PASSAGE PORT', 'UPP-DECK HOSPITAL', 'UPP-DECK LOBBY',
    'UPP-DECK S/G/R ENTRANCE',
  ]],
  [6, 'STEERING GEAR RM', 1, 111, ['UPP-DECK S/G/R ENTRANCE', 'S/G/R PORT', 'S/G/R PORT', "S/G/R ST'BD", "S/G/R ST'BD", 'S/G/R']],
  [7, 'BOSUN STORE', 1, 121, ["BOSUN STORE ST'BD", "BOSUN STORE ST'BD", 'BOSUN STORE PORT', 'BOSUN STORE CENTER', 'BOSUN STORE PORT']],
  [8, 'STAIRWAY', 1, 131, ['STAIRWAY A-DECK', 'STAIRWAY B-DECK', 'STAIRWAY NAV. DECK']],
  [9, 'E/R 1ST DECK', 2, 1, [
    "E/R 1ST-DECK ST'BD", 'E/R 1ST-DECK E/R STORE', 'E/R 1ST-DECK WORKSHOP',
    'E/R 1ST-DECK WORKSHOP', 'E/R 1ST-DECK WORKSHOP', "E/R 1ST-DECK ST'BD",
    'E/R 1ST-DECK E/R ENTRANCE (UPP DK)', 'E/R 1ST-DECK E/R ENTRANCE (UPP DK)',
    'E/R 1ST-DECK CENTER', 'E/R 1ST-DECK PORT', 'E/R 1ST-DECK PORT',
    'E/R 1ST-DECK ENGINE CONTROL CONSOLE', 'E/R 1ST-DECK ENGINE CONTROL ROOM',
    'E/R 1ST-DECK ELEC. WORKSHOP', 'E/R 1ST-DECK ENGINE CONTROL ROOM',
    'E/R 1ST-DECK ENGINE CONTROL ROOM', 'E/R 1ST-DECK PORT', 'E/R 1ST-DECK',
  ]],
  [10, 'E/R CASING', 2, 21, [
    'E/R CASING UPP-DK', 'E/R CASING A-DK', 'E/R CASING B-DK', 'E/R CASING B-DK',
    'E/R CASING C-DK', 'E/R CASING UPP-DK', 'E/R CASING UPP-DK',
  ]],
  [11, 'E/R 2ND DECK', 2, 31, [
    'E/R 2ND-DECK PORT', "E/R 2ND-DECK ST'BD", "E/R 2ND-DECK ST'BD", "E/R 2ND-DECK ST'BD",
    "E/R 2ND-DECK ST'BD", 'E/R 2ND-DECK HYD.POWER PACK RM', 'E/R 2ND-DECK PORT',
    'E/R 2ND-DECK PURIFIER RM', 'E/R 2ND-DECK PORT', 'E/R 2ND-DECK PORT',
  ]],
  [12, 'E/R FLOOR', 2, 51, [
    'E/R FLOOR PORT', 'E/R FLOOR PORT', 'E/R FLOOR PORT', 'E/R FLOOR CENTER',
    "E/R FLOOR ST'BD", "E/R FLOOR ST'BD", "E/R FLOOR ST'BD", 'E/R FLOOR CENTER',
    'E/R FLOOR CENTER', 'E/R FLOOR PORT',
  ]],
  [13, 'I.G.G. CASING', 3, 1, ['CASING A-DECK I.G.G', 'CASING A-DECK I.G.G', 'CASING UPP-DECK I.G.G']],
  [14, 'E/R 1ST DK MACHINERY', 3, 11, [
    'E/R 1ST-DK AUX. BOILER', 'E/R 1ST-DK AUX. BOILER', 'E/R 1ST-DK AUX. BOILER',
    'E/R 1ST-DK INCINERATOR', 'E/R 1ST-DK INCINERATOR', 'E/R 1ST-DK INCINERATOR',
    'E/R 1ST-DK MAIN ENGINE', 'E/R 1ST-DK MAIN ENGINE', 'E/R 1ST-DK MAIN ENGINE',
    'E/R 1ST-DK MAIN ENGINE',
  ]],
  [15, 'E/R 2ND DK MACHINERY', 3, 31, [
    'E/R 2ND-DK NO.1/2 GEN. ENGINE', 'E/R 2ND-DK NO.1/2 GEN. ENGINE', 'E/R 2ND-DK NO.1/2 GEN. ENGINE',
    'E/R 2ND-DK NO.3 GEN. ENGINE', 'E/R 2ND-DK NO.3 GEN. ENGINE', 'E/R 2ND-DK NO.3 GEN. ENGINE',
    'E/R 2ND-DK PURIFIER RM', 'E/R 2ND-DK PURIFIER RM',
  ]],
];

// Manual call points and heat detectors ("zone:address"); zones 13-15 are flame
// detectors; everything else is a smoke detector.
const MCP = new Set(['1:2', '2:13', '2:27', '3:43', '3:57', '4:76', '4:83', '5:97', '5:103', '6:111', '7:124',
  '9:7', '9:12', '11:37', '12:60']);
const HEAT = new Set(['4:75', '4:85', '4:86', '9:14']);

function typeOf(zone, addr) {
  const key = `${zone}:${addr}`;
  if (MCP.has(key)) return 'MCP';
  if (HEAT.has(key)) return 'HEAT';
  return zone >= 13 ? 'FLAME' : 'SMOKE';
}

export const ZONES = BUILDER.map(([no, name, loop, first, texts]) => ({
  no, name, loop,
  units: texts.map((text, i) => ({ zone: no, addr: first + i, type: typeOf(no, first + i), text })),
}));

// Order and wording as in the user guide (5.7.5).
export const TYPE_GROUPS = [
  ['SMOKE', 'Smoke detectors'],
  ['ALL', 'All detectors'],
  ['HEAT', 'Heat detectors'],
  ['FLAME', 'Flame detectors'],
  ['MCP', 'Manual Call Points'],
];
export const groupLabel = g => (TYPE_GROUPS.find(t => t[0] === g) || [g, g])[1];

/** "All detectors" leaves the manual call points connected. */
export const matchType = (group, type) => (group === 'ALL' ? type !== 'MCP' : group === type);

export const zoneByNo = no => ZONES.find(z => z.no === no) || null;
export const unitAt = (zone, addr) => {
  const z = zoneByNo(zone);
  return (z && z.units.find(u => u.addr === addr)) || null;
};
export const unitName = u => `ZONE ${u.zone} ${u.type} ${u.addr}`;
export const unitKey = u => `${u.zone}:${u.addr}`;
