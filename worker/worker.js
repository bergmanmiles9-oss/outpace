export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    // GET /schedule?date=2026-09-21  -> list entries
    if (url.pathname === "/schedule" && request.method === "GET") {
      const data = (await env.SCHEDULE_KV.get("entries", { type: "json" })) || [];
      const date = url.searchParams.get("date");
      const filtered = date ? data.filter((e) => e.date === date) : data;
      return json(filtered, cors);
    }

    // POST /schedule -> add an entry (requires the secret)
    if (url.pathname === "/schedule" && request.method === "POST") {
      if (request.headers.get("Authorization") !== `Bearer ${env.API_SECRET}`) {
        return json({ error: "Unauthorized" }, cors, 401);
      }
      const body = await request.json();
      const { person, start, end, label, date, color } = body;
      if (!person || !start || !end || !label) {
        return json({ error: "Missing person, start, end, or label" }, cors, 400);
      }
      const entries = (await env.SCHEDULE_KV.get("entries", { type: "json" })) || [];
      const entry = {
        id: crypto.randomUUID(),
        person,
        start,                              // "12:00"
        end,                                // "15:00"
        label,
        color: color === "red" ? "red" : "yellow",
        date: date || new Date().toISOString().slice(0, 10),
      };
      entries.push(entry);
      await env.SCHEDULE_KV.put("entries", JSON.stringify(entries));
      return json(entry, cors, 201);
    }

    // DELETE /schedule/:id -> remove an entry (requires the secret)
    if (url.pathname.startsWith("/schedule/") && request.method === "DELETE") {
      if (request.headers.get("Authorization") !== `Bearer ${env.API_SECRET}`) {
        return json({ error: "Unauthorized" }, cors, 401);
      }
      const id = url.pathname.split("/").pop();
      let entries = (await env.SCHEDULE_KV.get("entries", { type: "json" })) || [];
      entries = entries.filter((e) => e.id !== id);
      await env.SCHEDULE_KV.put("entries", JSON.stringify(entries));
      return json({ success: true }, cors);
    }

    return json({ error: "Not found" }, cors, 404);
  },
};

function json(data, cors, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}