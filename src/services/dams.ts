import { eq, and, between, or, SQL, desc, ilike } from "drizzle-orm";
import { damLevels, dams } from "../db/schema";
import { db } from "../db";

export type DamFilter = {
  dam?: string;        // dam id or EN name
  date?: string;       // YYYYMMDD
  limit?: number;
};

export function parseDateYMDRange(dateStr: string) {
  if (!/^\d{8}$/.test(dateStr)) throw new Error("Invalid date format");
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  const start = new Date(`${y}-${m}-${d}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export async function getDamLevels(filter: DamFilter) {
  let damIds: number[] = [];

  // ----- Dam lookup: numeric ID or EN name (case-insensitive) -----
  if (filter.dam) {
    const damFilters = [];
    const damIdMaybe = Number(filter.dam);

    if (!Number.isNaN(damIdMaybe)) {
      damFilters.push(eq(dams.id, damIdMaybe));
    }

    // Lowercase search term, match anywhere in en_name
    damFilters.push(ilike(dams.enName, `%${filter.dam.toLowerCase()}%`));

    const damRows = await db
      .select({ id: dams.id })
      .from(dams)
      .where(or(...damFilters));

    damIds = damRows.map(r => r.id);
    if (damIds.length === 0) {
      return [];
    }
  }

  // ----- Date filter -----
  let dateCond: SQL | undefined;
  if (filter.date) {
    const { start, end } = parseDateYMDRange(filter.date);
    dateCond = between(damLevels.observationTime, start, end);
  }

  // ----- WHERE clause -----
  let whereClause: SQL | undefined;
  if (damIds.length > 0 && dateCond) {
    whereClause = and(eq(damLevels.damId, damIds[0]), dateCond);
  } else if (damIds.length > 0) {
    whereClause = eq(damLevels.damId, damIds[0]);
  } else if (dateCond) {
    whereClause = dateCond;
  }

  // ----- Query -----
  const rows = await db
    .select()
    .from(damLevels)
    .where(whereClause)
    .orderBy(desc(damLevels.observationTime))
    .limit(filter.limit ?? 100);

  return rows;
}
