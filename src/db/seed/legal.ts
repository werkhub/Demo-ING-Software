/**
 * Seed-Sektion: Gesetzes-Chunks (BGB, HOAI, VOB/A/B/C).
 *
 * Voller Replace bei jedem Seed-Lauf, damit Aktualisierungen der Quell-Module
 * (etwa nach `npm run db:fetch-laws`) auch alte Inhalte überschreiben.
 */
import { db } from "../index";
import { legalChunks } from "../schema";
import { BGB } from "../../data/legal/bgb";
import { HOAI } from "../../data/legal/hoai";
import { VOB_A } from "../../data/legal/vob-a";
import { VOB_B } from "../../data/legal/vob-b";
import { VOB_C } from "../../data/legal/vob-c";

export async function seedLegalChunks(): Promise<void> {
  await db.delete(legalChunks);
  const allChunks = [
    ...BGB.map((c) => ({ ...c, id: `bgb_${c.slug}`, source: "bgb" as const })),
    ...HOAI.map((c) => ({ ...c, id: `hoai_${c.slug}`, source: "hoai" as const })),
    ...VOB_A.map((c) => ({ ...c, id: `vob_a_${c.slug}`, source: "vob_a" as const })),
    ...VOB_B.map((c) => ({ ...c, id: `vob_b_${c.slug}`, source: "vob_b" as const })),
    ...VOB_C.map((c) => ({ ...c, id: `vob_c_${c.slug}`, source: "vob_c" as const })),
  ];
  await db.insert(legalChunks).values(allChunks);
  console.log(
    `  ✓ ${allChunks.length} Gesetzes-Chunks (BGB ${BGB.length} · HOAI ${HOAI.length} · VOB/A ${VOB_A.length} · VOB/B ${VOB_B.length} · VOB/C ${VOB_C.length})`
  );
}
