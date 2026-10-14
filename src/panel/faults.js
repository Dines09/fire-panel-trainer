// Fault codes used by the trainer. Name, cause and remedy are taken from the
// Fault Code List in the user guide (appendix 7.1).
export const FAULT_CODES = {
  128: {
    name: 'NO ANSWER',
    cause: 'Lost communication: the system knows the unit but has lost contact (unit removed or defect, wrong type, double address, cable break or short circuit in the loop).',
    remedy: 'Refit or replace the unit. Check the address. Locate the cable break or short circuit.',
  },
  130: {
    name: 'DIRTY SENSOR',
    cause: 'The detector has a dirty (polluted) sensor element.',
    remedy: 'Replace the detector.',
  },
  155: {
    name: 'EARTH FAULT POSITIVE',
    cause: 'Earth fault on the positive conductor.',
    remedy: 'Locate the earth fault.',
  },
  159: {
    name: 'CABLE BREAK',
    cause: 'A cable break has been detected.',
    remedy: 'Restore the cable.',
  },
  163: {
    name: 'BATTERY FAULT',
    cause: 'Low battery voltage detected.',
    remedy: 'Charge the battery. If the fault remains, replace the battery.',
  },
  180: {
    name: 'MAINS POWER',
    cause: 'The main power supply is lost.',
    remedy: 'Check the main power supply.',
  },
};

// Faults of the central itself that the ship panel can switch on and off.
export const SYSTEM_FAULTS = {
  mains: { code: 180, src: 'CENTRAL 1 CHARGERM 4', sub: 'CHM 1.4', label: 'Mains power lost' },
  battery: { code: 163, src: 'CENTRAL 1 CHARGERM 4', sub: 'CHM 1.4', label: 'Battery low' },
  earth: { code: 155, src: 'CENTRAL 1 LOOPM 2', sub: 'LPM 1.2', label: 'Earth fault on loop' },
  bell: { code: 159, src: 'CENTRAL 1 I/OM 3 OUTPUT 1', sub: 'Alarm bells', label: 'Bell cable broken', dev: true },
};
