import { Hono } from "hono";
import { logger } from "hono/logger";
import { swaggerUI } from "@hono/swagger-ui";
import { measurementsApi } from "./src/api/v1/measurements";
import damsApi from "./src/api/v1/dams";

const app = new Hono();
app.use(logger());
app.route("/measurements", measurementsApi);
app.route("/dams",damsApi)

app.get("/", (c) => {
  return c.html(`
    <html>
      <head>
        <title>Fukuoka API</title>
      </head>
      <body>
        <h1>👋 Welcome to the Fukuoka API!</h1>
        <p>Check out the <a href="${process.env.API_BASE_URL}/docs" target="_blank" rel="noopener noreferrer">API documentation</a>.</p>
      </body>
    </html>
  `);
});


app.get(
  "/docs",
  swaggerUI({
    url: "/openapi.json",
  })
);

app.get("/openapi.json", (c) => {
  return c.json({
    openapi: "3.0.0",
    info: {
      title: "Air Quality API",
      version: "1.0.0",
      description: "API for accessing air quality measurements",
    },
    paths: {
      "/measurements": {
        get: {
          summary: "Get air quality measurements",
          description:
            "Retrieve air quality measurements with filtering options",
          parameters: [
            {
              name: "station",
              in: "query",
              description: "Filter by station ID",
              schema: {
                type: "string",
                enum: [
                  "kashii",
                  "higashi",
                  "yoshizuka",
                  "haruyoshi",
                  "minami",
                  "nagao",
                  "sohara",
                  "motooka",
                  "chidoriashi",
                  "hie",
                  "tenjin",
                  "ohashi",
                  "befubashi",
                  "nishijin",
                  "ishimaru",
                  "imajuku",
                ],
              },
              example: "kashii",
            },
            {
              name: "type",
              in: "query",
              description: "Filter by measurement type",
              schema: {
                type: "string",
                enum: [
                  "no",
                  "no2",
                  "nox",
                  "oxidant",
                  "nmhc",
                  "ch4",
                  "thc",
                  "spm",
                  "pm25",
                  "wind_speed",
                  "wind_dir",
                  "so2",
                  "co",
                  "sunlight",
                ],
              },
              example: "pm25",
            },
            {
              name: "date",
              in: "query",
              description: "Filter by specific date (YYYYMMDD format)",
              schema: { type: "integer", format: "int32" },
            },
            {
              name: "date_from",
              in: "query",
              description: "Filter by start date (YYYYMMDD format)",
              schema: { type: "integer", format: "int32" },
            },
            {
              name: "date_to",
              in: "query",
              description: "Filter by end date (YYYYMMDD format)",
              schema: { type: "integer", format: "int32" },
            },
            {
              name: "hour_from",
              in: "query",
              description: "Filter by start hour (0-23)",
              schema: { type: "integer", minimum: 0, maximum: 23 },
            },
            {
              name: "hour_to",
              in: "query",
              description: "Filter by end hour (0-23)",
              schema: { type: "integer", minimum: 0, maximum: 23 },
            },
            {
              name: "limit",
              in: "query",
              description: "Limit number of results (max 500)",
              schema: {
                type: "integer",
                default: 100,
                maximum: 500,
                minimum: 1,
              },
            },
            {
              name: "offset",
              in: "query",
              description: "Offset for pagination",
              schema: { type: "integer", default: 0, minimum: 0 },
            },
          ],
          responses: {
            "200": {
              description: "A list of air quality measurements",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        date: {
                          type: "integer",
                          description: "Date in YYYYMMDD format",
                        },
                        hour: {
                          type: "integer",
                          description: "Hour of day (0-23)",
                        },
                        stationId: {
                          type: "integer",
                          description: "ID of the measurement station",
                        },
                        stationName: {
                          type: "string",
                          description: "Name of the station",
                        },
                        measurementTypeId: {
                          type: "integer",
                          description: "ID of the measurement type",
                        },
                        measurementType: {
                          type: "string",
                          description:
                            "Type of measurement (e.g., 'no2', 'pm25')",
                        },
                        lat: {
                          type: "number",
                          format: "float",
                          description: "Latitude of the station",
                        },
                        lng: {
                          type: "number",
                          format: "float",
                          description: "Longitude of the station",
                        },
                        unit: {
                          type: "string",
                          description: "Unit of measurement",
                        },
                        value: {
                          type: ["number", "null"],
                          description: "Measured value, null if not available",
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Invalid request parameters",
            },
            "404": {
              description: "No data found matching the criteria",
            },
            "500": {
              description: "Internal server error",
            },
          },
        },
      },
      "/dams": {
        get: {
          summary: "Get dam water levels",
          description: "Retrieve dam water levels with optional filters for dam name, date, and result limit.",
          parameters: [
            {
              name: "dam",
              in: "query",
              description: "Filter by dam ID or English name (case-insensitive)",
              schema: {
                type: "string",
              },
              example: "Ino",
            },
            {
              name: "date",
              in: "query",
              description: "Filter by specific date (YYYYMMDD format)",
              schema: {
                type: "string",
                pattern: "^\\d{8}$",
              },
              example: "20250809",
            },
            {
              name: "limit",
              in: "query",
              description: "Limit the number of results (default: 100)",
              schema: {
                type: "integer",
                default: 100,
                minimum: 1,
              },
              example: 50,
            },
          ],
          responses: {
            "200": {
              description: "A list of dam water levels",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        damId: { type: "integer", description: "ID of the dam" },
                        damName: { type: "string", description: "Name of the dam" },
                        observationTime: { type: "string", format: "date-time", description: "Time of observation" },
                        waterLevel: { type: "number", description: "Water level in meters" },
                        capacity: { type: "number", description: "Capacity of the dam in percentage" },
                      },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Invalid request parameters",
            },
            "404": {
              description: "No data found matching the criteria",
            },
            "500": {
              description: "Internal server error",
            },
          },
        },
      },
    },
  });
});

// Simple API documentation
app.get("/doc", (c) =>
  c.json({
    message: "Air Quality API Documentation",
    endpoints: [
      { path: "/measurements", methods: ["GET"] },
      { path: "/docs", description: "Interactive API documentation" },
      { path: "/health", description: "Health check endpoint" },
    ],
  })
);
export default app;