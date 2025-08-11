import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import fs from "fs/promises";
import { parse } from "csv-parse/sync";
import path from "path";
import { decode } from "iconv-lite";
import { damLevels, dams } from "../db/schema";
import { eq } from "drizzle-orm";

const damNameMap: Record<string, { jp: string; en: string }> = {
  "南畑ダム": { jp: "南畑ダム", en: "Minamihata" },
  "五ケ山ダム": { jp: "五ケ山ダム", en: "Gokayama" },
  "脊振ダム": { jp: "脊振ダム", en: "Seburi" },
  "曲渕ダム": { jp: "曲渕ダム", en: "Magaribuchi" },
  "江川ダム": { jp: "江川ダム", en: "Egawa" },
  "久原ダム": { jp: "久原ダム", en: "Kuhara" },
  "長谷ダム": { jp: "長谷ダム", en: "Nagaya" },
  "猪野ダム": { jp: "猪野ダム", en: "Ino" },
  "瑞梅寺ダム": { jp: "瑞梅寺ダム", en: "Zuibaiji" },
};

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(sql);

  // --- Seed dams ---
  for (const jpName of Object.keys(damNameMap)) {
    const enName = damNameMap[jpName].en;
    await db
      .insert(dams)
      .values({ jpName, enName })
      .onConflictDoNothing();
  }

  // --- Build dam id cache ---
  const damRows = await db.select().from(dams);
  const damCache = new Map<string, number>();
  damRows.forEach(row => {
    damCache.set(row.jpName, row.id);
    damCache.set(row.enName, row.id);
  });

  // --- Read + decode CSV as Shift-JIS ---
  const csvPath = path.resolve("./fukuoka_9_damu_data.csv");
  const buffer = await fs.readFile(csvPath);
  const csvText = decode(buffer, "shift_jis"); // <<< key change

  // --- Parse CSV ---
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log("First parsed row keys:", Object.keys(records[0])); // debug

  // --- Prepare rows ---
  const insertData: typeof damLevels.$inferInsert[] = [];
  for (const row of records) {
    const obsTimeStr = row["観測時刻"]?.replace(/\//g, "-").trim();
    if (!obsTimeStr) continue;

    const obsTime = new Date(obsTimeStr);
    for (const jpName of Object.keys(damNameMap)) {
      const damId = damCache.get(jpName);
      const valStr = row[jpName];
      const damValue = parseInt(valStr, 10);
      if (!damId || isNaN(damValue)) continue;

      insertData.push({
        damId,
        observationTime: obsTime,
        damValue,
      });
    }
  }

  console.log(`Prepared ${insertData.length} dam level rows`);

  // --- Batch insert ---
  const batchSize = 1000;
  for (let i = 0; i < insertData.length; i += batchSize) {
    await db.insert(damLevels)
      .values(insertData.slice(i, i + batchSize))
      .onConflictDoNothing();
  }

  console.log("Dam levels import complete");
  await sql.end();
}

main().catch(e => {
  console.error("Import error:", e);
  process.exit(1);
});
