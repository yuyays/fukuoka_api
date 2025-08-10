import { Hono } from "hono";
import { getDamLevels } from "../../services/dams";

const damsApi = new Hono();

damsApi.get("/", async (c) => {
  try {
    const dam = c.req.query("dam");   // optional
    const date = c.req.query("date"); // optional
    const limit = c.req.query("limit") ? Number(c.req.query("limit")) : 100;
    console.log(`Query params: dam=${dam}, date=${date}, limit=${limit}`);
    
    const results = await getDamLevels({ dam, date, limit });
    
    
    if (results.length === 0) {
      return c.json({ message: "No data found" }, 404); // Proper 404 message
    }
    
    return c.json(results, 200);
  } catch (err) {
    console.error(err);
    return c.json({ error: (err as Error).message }, 400);
  }
});

export default damsApi;
