import { Hono } from "hono";

type CacheRefreshMessage = { application_id: string };

const app = new Hono<{ Bindings: Env }>().basePath("/api");

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

const getFlagCacheKey = (appId: string) => `app-${appId}`;

app.post("/flags", async (c) => {
  let params;

  try {
    params = await c.req.json<{
      application_id?: string;
      key?: string;
      enabled?: boolean;
      description?: string;
    }>();
  } catch {
    return c.json({ message: "Invalid JSON body" }, 400);
  }

  const errors: string[] = [];

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
      `INSERT INTO flags (application_id, key, enabled, description)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(application_id, key) DO UPDATE SET
         enabled = excluded.enabled
       RETURNING application_id, key, enabled`,
    )
    .bind(
      params.application_id,
      params.key,
      params.enabled ? 1 : 0,
      params.description ?? "",
    )
    .first<{ application_id: string; key: string; enabled: number }>();

  if (result?.application_id) {
    // Drop stale KV immediately so the next uncached read hits D1.
    // Queue still rebuilds KV for subsequent cache hits (eventual consistency).
    await c.env.feature_flag_kv.delete(getFlagCacheKey(result.application_id));
    await c.env.feature_flag_cache_refresh.send({
      application_id: result.application_id,
    } satisfies CacheRefreshMessage);
  }

  return c.json(
    result
      ? {
          application_id: result.application_id,
          key: result.key,
          enabled: Boolean(result.enabled),
        }
      : result,
    200,
  );
});

app.get("/flags", async (c) => {
  const appId = c.req.query("application_id");

  if (!appId) {
    return c.json({ message: "Missing application id query" }, 403);
  }

  const cacheKey = getFlagCacheKey(appId);
  // Admin / read-your-writes: skip KV (it's eventually consistent).
  const fresh = c.req.query("fresh") === "1";

  if (!fresh) {
    const cached = await c.env.feature_flag_kv.get(cacheKey, { type: "json" });
    if (cached) {
      return c.json({
        data: cached,
        fromCache: true,
      });
    }
  }

  console.log(fresh ? "Fresh read from D1" : "Cache miss. Fetching fresh data");

  const { results } = await c.env.feature_flag_db
    .prepare("SELECT key, enabled FROM flags WHERE application_id = ?")
    .bind(appId)
    .all<{ key: string; enabled: number }>();

  const data = Object.fromEntries(
    results.map(({ key, enabled }) => [key, Boolean(enabled)]),
  );

  await c.env.feature_flag_kv.put(cacheKey, JSON.stringify(data), {
    expirationTtl: 60 * 60 * 24, // expiration in seconds, 1d
  });

  return c.json({
    data,
    fromCache: false,
  });
});

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch, env: Env) {
    for (const msg of batch.messages) {
      const { application_id } = msg.body as CacheRefreshMessage;

      const { results } = await env.feature_flag_db
        .prepare("SELECT key, enabled FROM flags WHERE application_id = ?")
        .bind(application_id)
        .all<{ key: string; enabled: number }>();

      const data = Object.fromEntries(
        results.map(({ key, enabled }) => [key, Boolean(enabled)]),
      );

      const cacheKey = getFlagCacheKey(application_id);

      await env.feature_flag_kv.put(cacheKey, JSON.stringify(data), {
        expirationTtl: 60 * 60 * 24, // expiration in seconds, 1d
      });

      msg.ack();
    }
  },
};
