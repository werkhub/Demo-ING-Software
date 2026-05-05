import type {
  BautagebuchCategory,
  WeatherCondition,
} from "@/db/schema";

export const CATEGORY_LABEL: Record<BautagebuchCategory, string> = {
  allgemein: "Allgemein",
  anordnung: "Anordnung",
  behinderung: "Behinderung",
  mangel: "Mangel",
  bedenken: "Bedenken",
  lieferung: "Lieferung",
  besichtigung: "Besichtigung",
  personal: "Personal",
};

export const CATEGORY_OPTIONS: Array<{
  value: BautagebuchCategory;
  label: string;
}> = (
  [
    "allgemein",
    "anordnung",
    "behinderung",
    "mangel",
    "bedenken",
    "lieferung",
    "besichtigung",
    "personal",
  ] as const
).map((v) => ({ value: v, label: CATEGORY_LABEL[v] }));

export const WEATHER_LABEL: Record<WeatherCondition, string> = {
  sonnig: "Sonnig",
  bewoelkt: "Bewölkt",
  regen: "Regen",
  schnee: "Schnee",
  frost: "Frost",
  sturm: "Sturm",
  nebel: "Nebel",
};

export const WEATHER_OPTIONS: Array<{
  value: WeatherCondition;
  label: string;
}> = (
  ["sonnig", "bewoelkt", "regen", "schnee", "frost", "sturm", "nebel"] as const
).map((v) => ({ value: v, label: WEATHER_LABEL[v] }));
