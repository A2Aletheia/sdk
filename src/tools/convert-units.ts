import { parseEther, formatEther, parseGwei, formatGwei } from "viem";

// ── Types ────────────────────────────────────────────────────────────────────

export type CryptoUnit = "wei" | "gwei" | "ether";
export type TimeUnit = "seconds" | "minutes" | "hours" | "days";
export type DataUnit = "bytes" | "KB" | "MB" | "GB" | "TB";
export type SupportedUnit = CryptoUnit | TimeUnit | DataUnit;
export type UnitCategory = "crypto" | "time" | "data";

export interface UnitConversionInput {
  value: string;
  from: SupportedUnit;
  to: SupportedUnit;
}

export interface UnitConversionResult {
  tool: "convert_units";
  inputValue: string;
  fromUnit: SupportedUnit;
  toUnit: SupportedUnit;
  result: string;
  category: UnitCategory;
}

// ── Unit category lookup ─────────────────────────────────────────────────────

const UNIT_CATEGORIES: Record<SupportedUnit, UnitCategory> = {
  wei: "crypto",
  gwei: "crypto",
  ether: "crypto",
  seconds: "time",
  minutes: "time",
  hours: "time",
  days: "time",
  bytes: "data",
  KB: "data",
  MB: "data",
  GB: "data",
  TB: "data",
};

const ALL_UNITS = Object.keys(UNIT_CATEGORIES) as SupportedUnit[];

// ── Crypto conversions (via viem bigint functions) ───────────────────────────

function convertCrypto(
  value: string,
  from: CryptoUnit,
  to: CryptoUnit,
): string {
  if (from === to) return value;

  let weiValue: bigint;

  switch (from) {
    case "ether":
      weiValue = parseEther(value);
      break;
    case "gwei":
      weiValue = parseGwei(value);
      break;
    case "wei":
      weiValue = BigInt(value);
      break;
  }

  switch (to) {
    case "ether":
      return formatEther(weiValue);
    case "gwei":
      return formatGwei(weiValue);
    case "wei":
      return weiValue.toString();
  }
}

// ── Time conversions (through seconds) ───────────────────────────────────────

const TIME_TO_SECONDS: Record<TimeUnit, number> = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
  days: 86400,
};

function convertTime(value: string, from: TimeUnit, to: TimeUnit): string {
  const numValue = Number(value);
  if (!Number.isFinite(numValue)) {
    throw new Error(`Invalid numeric value: ${value}`);
  }
  const inSeconds = numValue * TIME_TO_SECONDS[from];
  return (inSeconds / TIME_TO_SECONDS[to]).toString();
}

// ── Data conversions (through bytes) ─────────────────────────────────────────

const DATA_TO_BYTES: Record<DataUnit, number> = {
  bytes: 1,
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
  TB: 1024 ** 4,
};

function convertData(value: string, from: DataUnit, to: DataUnit): string {
  const numValue = Number(value);
  if (!Number.isFinite(numValue)) {
    throw new Error(`Invalid numeric value: ${value}`);
  }
  const inBytes = numValue * DATA_TO_BYTES[from];
  return (inBytes / DATA_TO_BYTES[to]).toString();
}

// ── Core function ────────────────────────────────────────────────────────────

export function convertUnits(
  value: string,
  from: SupportedUnit,
  to: SupportedUnit,
): UnitConversionResult {
  const fromCategory = UNIT_CATEGORIES[from];
  const toCategory = UNIT_CATEGORIES[to];

  if (!fromCategory) {
    throw new Error(
      `Unsupported unit: "${from}". Supported units: ${ALL_UNITS.join(", ")}`,
    );
  }
  if (!toCategory) {
    throw new Error(
      `Unsupported unit: "${to}". Supported units: ${ALL_UNITS.join(", ")}`,
    );
  }
  if (fromCategory !== toCategory) {
    throw new Error(
      `Cannot convert between different categories: "${from}" (${fromCategory}) and "${to}" (${toCategory})`,
    );
  }

  let result: string;

  switch (fromCategory) {
    case "crypto":
      result = convertCrypto(value, from as CryptoUnit, to as CryptoUnit);
      break;
    case "time":
      result = convertTime(value, from as TimeUnit, to as TimeUnit);
      break;
    case "data":
      result = convertData(value, from as DataUnit, to as DataUnit);
      break;
  }

  return {
    tool: "convert_units",
    inputValue: value,
    fromUnit: from,
    toUnit: to,
    result,
    category: fromCategory,
  };
}

// ── Tool definition (OpenAI-compatible / LangChain / Vercel AI SDK) ──────────

const UNIT_ENUM = [
  "wei",
  "gwei",
  "ether",
  "seconds",
  "minutes",
  "hours",
  "days",
  "bytes",
  "KB",
  "MB",
  "GB",
  "TB",
] as const;

export const convertUnitsToolDefinition = {
  type: "function" as const,
  function: {
    name: "convert_units",
    description:
      "Convert a value between units in the same category. Categories: crypto (wei, gwei, ether — bigint precision), time (seconds, minutes, hours, days), data (bytes, KB, MB, GB, TB). Both 'from' and 'to' units must belong to the same category.",
    parameters: {
      type: "object" as const,
      properties: {
        value: {
          type: "string" as const,
          description:
            "The numeric value to convert, as a string for precision (e.g. '1.5', '1000000000000000000')",
        },
        from: {
          type: "string" as const,
          enum: UNIT_ENUM,
          description: "The source unit to convert from",
        },
        to: {
          type: "string" as const,
          enum: UNIT_ENUM,
          description: "The target unit to convert to",
        },
      },
      required: ["value", "from", "to"] as const,
      additionalProperties: false as const,
    },
  },
  execute: (input: UnitConversionInput): UnitConversionResult =>
    convertUnits(input.value, input.from, input.to),
};
