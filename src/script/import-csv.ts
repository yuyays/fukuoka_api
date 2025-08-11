import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import fs from "fs/promises";
import { parse } from "csv-parse/sync";
import path from "path";
import { decode } from "iconv-lite";
import { measurements, measurementTypes, stations } from "../db/schema";
import { eq } from "drizzle-orm";

// -- Simple Romaji mapping for station names (extend as needed) --
const stationNameRomaji: Record<string, string> = {
  香椎: "kashii",
  東: "higashi",
  吉塚: "yoshizuka",
  春吉: "haruyoshi",
  南: "minami",
  長尾: "nagao",
  祖原: "sohara",
  元岡: "motooka",
  千鳥橋: "chidoriashi",
  比恵: "hie",
  天神: "tenjin",
  大橋: "ohashi",
  別府橋: "befubashi",
  西新: "nishijin",
  石丸: "ishimaru",
  今宿: "imajuku",
  // Add other stations if any
};

// -- Measurement type English codes (extend as needed) --
const measurementTypeCode: Record<string, string> = {
  一酸化窒素: "no",
  二酸化窒素: "no2",
  窒素酸化物: "nox",
  光化学オキシダント: "oxidant",
  非メタン炭化水素: "nmhc",
  メタン: "ch4",
  全炭化水素: "thc",
  浮遊粒子状物質: "spm",
  "微小粒子状物質(PM2.5)": "pm25",
  風速: "wind_speed",
  風向: "wind_dir",
  二酸化硫黄: "so2",
  一酸化炭素: "co",
  日射量: "sunlight",
  // Add other types if needed
};

type CsvRow = {
  年月日: string;
  測定局名称: string;
  測定項目名称: string;
  緯度: string;
  経度: string;
  単位: string;
  [key: string]: string;
};

async function main() {
  // Setup DB connection
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(sql);

  // Read CSV as Buffer and decode Shift-JIS correctly
  const csvPath = path.resolve("./kankyodata48.csv"); // Adjust path if needed
  const buffer = await fs.readFile(csvPath);
  const csvText = decode(buffer, "shift_jis");

  // Parse CSV content
  const records: CsvRow[] = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
  });

  // Caches for IDs
  const stationCache = new Map<string, number>();
  const measurementTypeCache = new Map<string, number>();

  // Insert unique stations
  const uniqueStations = Array.from(
    new Set(records.map((r) => r.測定局名称))
  ).map((nameKanji) => ({
    nameKanji,
    nameEn: stationNameRomaji[nameKanji] ?? nameKanji,
  }));

  for (const station of uniqueStations) {
    const inserted = await db
      .insert(stations)
      .values({ nameKanji: station.nameKanji, nameEn: station.nameEn })
      .onConflictDoNothing()
      .returning({ id: stations.id });

    let id = inserted[0]?.id;
    if (!id) {
      const existing = await db
        .select({ id: stations.id })
        .from(stations)
        .where(eq(stations.nameKanji, station.nameKanji))
        .limit(1);
      id = existing[0].id;
    }
    stationCache.set(station.nameKanji, id);
  }

  // Insert unique measurement types
  const uniqueTypes = Array.from(
    new Set(records.map((r) => r.測定項目名称))
  ).map((nameKanji) => ({
    nameKanji,
    nameEn: measurementTypeCode[nameKanji] ?? nameKanji,
  }));

  for (const type of uniqueTypes) {
    const inserted = await db
      .insert(measurementTypes)
      .values({ nameKanji: type.nameKanji, nameEn: type.nameEn })
      .onConflictDoNothing()
      .returning({ id: measurementTypes.id });

    let id = inserted[0]?.id;
    if (!id) {
      const existing = await db
        .select({ id: measurementTypes.id })
        .from(measurementTypes)
        .where(eq(measurementTypes.nameKanji, type.nameKanji))
        .limit(1);
      id = existing[0].id;
    }
    measurementTypeCache.set(type.nameKanji, id);
  }

  // Prepare measurement insert objects
  const measurementsToInsert = [];

  for (const row of records) {
    const stationId = stationCache.get(row.測定局名称);
    const mtId = measurementTypeCache.get(row.測定項目名称);
    if (!stationId || !mtId) {
      // skip or log missing cache entries
      continue;
    }

    const date = Number(row.年月日);

    for (let hour = 1; hour <= 24; hour++) {
      const rawValue = row[`測定値(${hour}時)`];
      const value =
        rawValue === "*" || rawValue === "" || rawValue === undefined
          ? null
          : Number(rawValue);
      measurementsToInsert.push({
        date,
        stationId,
        measurementTypeId: mtId,
        lat: Number(row.緯度),
        lng: Number(row.経度),
        unit: row.単位,
        hour,
        value,
      });
    }
  }

  const batchSize = 1000;
  for (let i = 0; i < measurementsToInsert.length; i += batchSize) {
    const batch = measurementsToInsert.slice(i, i + batchSize);
    await db.insert(measurements).values(batch).onConflictDoNothing();
    console.log(
      `Inserted ${Math.min(i + batchSize, measurementsToInsert.length)} of ${
        measurementsToInsert.length
      }`
    );
  }

  console.log("CSV import done!");
  await sql.end();
}

main().catch((e) => {
  console.error("Error in CSV import:", e);
  process.exit(1);
});
