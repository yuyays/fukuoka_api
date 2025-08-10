import { Hono } from "hono";
import {
  getMeasurements,
  MeasurementFilter,
} from "../../services/measurements";

export const measurementsApi = new Hono();

measurementsApi.get("/", async (c) => {
  try {
    const query = c.req.query();

    const filter: MeasurementFilter = {
      station: query.station,
      type: query.type,
      date: query.date ? Number(query.date) : undefined,
      date_from: query.date_from ? Number(query.date_from) : undefined,
      date_to: query.date_to ? Number(query.date_to) : undefined,
      hour_from: query.hour_from ? Number(query.hour_from) : undefined,
      hour_to: query.hour_to ? Number(query.hour_to) : undefined,
      limit: query.limit ? Math.min(Number(query.limit), 500) : 100,
      offset: query.offset ? Number(query.offset) : 0,
    };

    // Basic validation example
    if (filter.date && (filter.date < 20000101 || filter.date > 21001231)) {
      return c.json({ error: "Invalid date" }, 400);
    }

    const results = await getMeasurements(filter);

    if (results.length === 0) {
      return c.json({ message: "No data found" }, 404);
    }

    return c.json(results);
  } catch (e) {
    console.error("API Error:", e);
    return c.json({ error: "Internal server error" }, 500);
  }
});
