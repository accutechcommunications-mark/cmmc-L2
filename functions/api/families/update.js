export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const {
      familyCode,
      controlId,
      status,
      implementationNotes
    } = body;

    if (!familyCode || !controlId) {
      return Response.json(
        { error: 'familyCode and controlId are required.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    await env.DB.prepare(`
      UPDATE controls_test
      SET status = ?,
          implementation_notes = ?,
          last_reviewed = ?
      WHERE control_family_code = ?
        AND control_id = ?
    `)
      .bind(status || 'not_started', implementationNotes || '', now, familyCode, controlId)
      .run();

    await env.DB.prepare(`
      UPDATE control_families_test
      SET updated_at = ?
      WHERE code = ?
    `)
      .bind(now, familyCode)
      .run();

    return Response.json({
      ok: true,
      familyCode,
      controlId,
      lastReviewed: now
    });
  } catch (error) {
    return Response.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}