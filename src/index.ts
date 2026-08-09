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
  const params = await c.req.json<{ name?: string }>();

  if (!params.name?.trim().length) {
    return c.json({
      message: "missing application name",
      status: 403,
    });
  }

  const result = await c.env.feature_flag_db
    .prepare("INSERT INTO applications (name) VALUES (?) RETURNING id, name")
    .bind(params.name)
    .first();
  return c.json(result, 201);
});

// Flag Routes

app.post("/flags", async (c) => {
  let params;

  try {
    params = await c.req.json<{
      application_id?: string;
      key?: string;
      enabled?: boolean;
      description?: string;
    }>();
  } catch (err) {
    return c.json({ message: "Invalid JSON body" }, 400);
  }

  let errors: string[] = [];

  if (!params.application_id) {
    errors.push("Missing application id");
  }

  if (!params.key) {
    errors.push("Missing key");
  }

  if (errors.length) {
    return c.json(
      {
        message: errors.join(", "),
      },
      403,
    );
  }

  const result = await c.env.feature_flag_db
    .prepare(
      "INSERT INTO flags (application_id, key, enabled, description) VALUES (?, ?, ?, ?) RETURNING application_id, key",
    )
    .bind(
      params.application_id,
      params.key,
      params.enabled ? 1 : 0,
      params.description ?? "",
    )
    .first();

  return c.json(result, 201);
});

app.get("/flags", async (c) => {
  const appId = c.req.query("application_id");

  if (!appId) {
    return c.json({ message: "Missing application id query" }, 403);
  }

  const cacheKey = `app-${appId}`;

  // Try to get flags from KV cache first
  let data = await c.env.feature_flag_kv.get(cacheKey, { type: "json" });
  let fromCache = true;

  if (!data) {
    console.log("Cache miss. Fetching fresh data");
    fromCache = false;

    const { results } = await c.env.feature_flag_db
      .prepare("SELECT key, enabled FROM flags WHERE application_id = ?")
      .bind(appId)
      .all<{ key: string; enabled: number }>();

    data = Object.fromEntries(
      results.map(({ key, enabled }) => [key, Boolean(enabled)]),
    );

    await c.env.feature_flag_kv.put(cacheKey, JSON.stringify(data), {
      expirationTtl: 60 * 60 * 24, // expiration in seconds, 1d
    });
  }

  return c.json({
    data,
    fromCache,
  });
});

export default app;
