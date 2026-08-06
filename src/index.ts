import { Hono } from "hono";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/health", (c) => {
  return c.json({
    status: "ok",
  });
});

// Applicaitons Routes

app.get("/applications", async (c) => {
  const { results } = await c.env.feature_flag_db
    .prepare("SELECT id, name FROM applications")
    .all();
  return c.json(results);
});

app.post("/applications", async (c) => {
  const { name } = await c.req.json<{ name: string }>();
  const result = await c.env.feature_flag_db
    .prepare("INSERT INTO applications (name) VALUES (?) RETURNING id, name")
    .bind(name)
    .first();
  return c.json(result, 201);
});

export default app;
