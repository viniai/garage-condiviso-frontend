import type { components } from "./schema";

type S = components["schemas"];
export type Me = S["MeOut"];
export type Profile = S["ProfileOut"];
export type ProfilePublic = S["ProfilePublic"];
export type Part = S["PartOut"];
export type PartCreate = S["PartCreate"];
export type Vehicle = S["VehicleOut"];
export type DiaryEntry = S["EntryOut"];
export type Review = S["ReviewOut"];
export type ReviewList = S["ReviewList"];
export type Report = S["ReportOut"];
export type PublicConfig = S["PublicConfig"];
export type ForwardingItem = S["ForwardingItemOut"];
export type Highlight = S["HighlightOut"];
export type HighlightItem = S["HighlightItemOut"];
export type Category = S["PartCreate"]["category"];

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "body", label: "Carrozzeria" },
  { value: "engine", label: "Motore" },
  { value: "light", label: "Fanaleria" },
  { value: "interior", label: "Interni" },
  { value: "other", label: "Altro" },
];

export const CATEGORY_COLORS: Record<string, string> = {
  body: "#3a6ea5",
  engine: "#c05621",
  light: "#e5a93c",
  interior: "#6b46c1",
  other: "#64748b",
};
