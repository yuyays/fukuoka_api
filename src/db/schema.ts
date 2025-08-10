import {
  pgTable,
  serial,
  integer,
  text,
  real,
  uniqueIndex,
  timestamp,
} from "drizzle-orm/pg-core";

export const stations = pgTable("stations", {
  id: serial("id").primaryKey(),
  nameEn: text("name_en").notNull().unique(),
  nameKanji: text("name_kanji").notNull().unique(),
});

export const measurementTypes = pgTable("measurement_types", {
  id: serial("id").primaryKey(),
  nameEn: text("name_en").notNull().unique(),
  nameKanji: text("name_kanji").notNull().unique(),
});

export const measurements = pgTable(
  "measurements",
  {
    id: serial("id").primaryKey(),
    date: integer("date").notNull(),
    stationId: integer("station_id")
      .notNull()
      .references(() => stations.id),
    measurementTypeId: integer("measurement_type_id")
      .notNull()
      .references(() => measurementTypes.id),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    unit: text("unit").notNull(),
    hour: integer("hour").notNull(),
    value: real("value"),
  },
  (table) => ({
    uniqueMeasurement: uniqueIndex("unique_measurement").on(
      table.date,
      table.stationId,
      table.measurementTypeId,
      table.hour
    ),
  })
);
//dam section
export const dams = pgTable('dams', {
  id: serial('id').primaryKey(),         // Unique dam id
  jpName: text('jp_name').notNull(),     // Japanese dam name
  enName: text('en_name').notNull(),     // English/romanized dam name
});

export const damLevels = pgTable('dam_levels', {
  id: serial('id').primaryKey(),             // Unique per reading
  damId: integer('dam_id').notNull(),        // Foreign key to dams.id
  observationTime: timestamp('observation_time').notNull(),
  damValue: integer('dam_value').notNull(),
});

