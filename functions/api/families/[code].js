export async function onRequestGet(context) {
  const { env, params } = context;
  const familyCode = params.code;

  try {
    const family = await env.DB.prepare(
      `SELECT id, code, name, status, completion_percent
       FROM control_families
       WHERE code = ?`
    ).bind(familyCode).first();

    if (!family) {
      return Response.json({ error: 'Family not found' }, { status: 404 });
    }

    const controlsResult = await env.DB.prepare(
      `SELECT control_id, title, status, implementation_notes, assessor_notes, due_date, last_reviewed_at
       FROM controls
       WHERE family_id = ?
       ORDER BY control_id ASC`
    ).bind(family.id).all();

    return Response.json({
      family,
      controls: controlsResult.results ?? []
    });
  } catch (error) {
    return Response.json(
      { error: 'Failed to load family detail', detail: String(error) },
      { status: 500 }
    );
  }
}
