import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatItemName(name: string): string {
  if (!name) return '';
  return name.trim().toUpperCase();
}

const DURABLE_KEYWORDS = [
  'DUST PAN', 'WALIS', 'GARDEN TOOLS', 'BROOM', 'MOP', 'SET', 'CALCULATOR', 'USB', 'DRIVE',
  'LAPTOP', 'COMPUTER', 'PRINTER', 'FAN', 'AIRCON', 'AIRCONDITIONER', 'TV', 'MONITOR', 'KEYBOARD',
  'MOUSE', 'CHAIR', 'DESK', 'TABLE', 'CABINET', 'SHELF', 'BOARD', 'CHALKBOARD', 'WHITEBOARD',
  'PROJECTOR', 'SPEAKER', 'MIC', 'MICROPHONE', 'CAMERA', 'TRIPOD', 'LAMP', 'LIGHT',
  'TOOL', 'DRILL', 'HAMMER', 'SCREWDRIVER', 'PLIERS', 'WRENCH', 'SAW', 'KNIFE', 'CUTTER',
  'STAPLER', 'PUNCH', 'BINDER', 'RACK', 'HANGER', 'LOCK', 'KEY', 'EXTENSION', 'CORD',
  'WIRES', 'CABLE', 'ADAPTER', 'CHARGER', 'BATTERY', 'POWERBANK', 'UPLIGHT', 'STROBE',
  'HOT WATER BAG', 'ICE BAG', 'THERMOMETER', 'STETHOSCOPE', 'SCALE', 'WEIGHT', 'BED', 'MAT',
  'COT', 'BLANKET', 'PILLOW', 'FIRST AID', 'KIT', 'BIN',
];

export function guessConsumable(name: string): boolean {
  const upper = name.trim().toUpperCase();
  const tokens = upper.split(/[\s\-_]+/);
  const hasDurable = DURABLE_KEYWORDS.some(kw => {
    if (tokens.includes(kw)) return true;
    if (upper.includes(kw)) return true;
    return false;
  });
  return !hasDurable;
}
