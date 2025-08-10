import { eq, and, or, gte, lte } from "drizzle-orm";
import { measurements, stations, measurementTypes } from "../db/schema";
import { db } from "../db";

export type MeasurementFilter = {
  station?: string;
  type?: string;
  date?: number;
  date_from?: number;
  date_to?: number;
  hour_from?: number;
  hour_to?: number;
  limit?: number;
  offset?: number;
};

export async function getMeasurements(filter: MeasurementFilter) {
  const query = db
    .select({
      id: measurements.id,
      date: measurements.date,
      hour: measurements.hour,
      value: measurements.value,
      unit: measurements.unit,
      lat: measurements.lat,
      lng: measurements.lng,
      station: stations.nameEn,
      stationKanji: stations.nameKanji,
      measurementType: measurementTypes.nameEn,
      measurementTypeKanji: measurementTypes.nameKanji,
    })
    .from(measurements)
    .innerJoin(stations, eq(measurements.stationId, stations.id))
    .innerJoin(
      measurementTypes,
      eq(measurements.measurementTypeId, measurementTypes.id)
    )
    .$dynamic(); // This enables dynamic query building

  const conditions = [];

  if (filter.station) {
    conditions.push(eq(stations.nameEn, filter.station));
  }
  if (filter.type) {
    conditions.push(eq(measurementTypes.nameEn, filter.type));
  }
  if (filter.date) {
    conditions.push(eq(measurements.date, filter.date));
  }
  if (filter.date_from) {
    conditions.push(gte(measurements.date, filter.date_from));
  }
  if (filter.date_to) {
    conditions.push(lte(measurements.date, filter.date_to));
  }
  if (filter.hour_from) {
    conditions.push(gte(measurements.hour, filter.hour_from));
  }
  if (filter.hour_to) {
    conditions.push(lte(measurements.hour, filter.hour_to));
  }

  if (conditions.length > 0) {
    query.where(and(...conditions));
  }

  query.limit(filter.limit || 100);
  if (filter.offset) {
    query.offset(filter.offset);
  }

  return await query;
}
