export async function onRequestGet(context) {
  const { env } = context;
  const query = `
    SELECT
      cf.code,
      cf.name,
      cf.status,
      cf.completion_percent,
      COUNT(c.id) AS control_count
    FROM control_families cf
    LEFT JOIN controls c ON c.family_id = cf.id
    GROUP BY cf.id
    ORDER BY cf.code ASC
  `;

  try {
    const result = await env.DB.prepare(query).all();
    return Response.json({ families: result.results ?? [] });
  } catch (error) {
    return Response.json({ error: 'Failed to load families', detail: String(error) }, { status: 500 });
  }
}
