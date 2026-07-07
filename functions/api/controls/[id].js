export async function onRequestPatch(context) {
  const { env, params, request } = context;
  const body = await request.json();
  const allowedStatuses = ['Not Started', 'In Progress', 'Partially Met', 'Implemented', 'Needs Evidence', 'Ready for Review', 'Blocked', 'At Risk'];

  if (body.status && !allowedStatuses.includes(body.status)) {
    return Response.json({ error: 'Invalid status value' }, { status: 400 });
  }

  try {
    await env.DB.prepare(
      `UPDATE controls
       SET status = COALESCE(?, status),
           implementation_notes = COALESCE(?, implementation_notes),
           assessor_notes = COALESCE(?, assessor_notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE control_id = ?`
    ).bind(body.status ?? null, body.implementation_notes ?? null, body.assessor_notes ?? null, params.id).run();

    return Response.json({ ok: true, control_id: params.id });
  } catch (error) {
    return Response.json({ error: 'Failed to update control', detail: String(error) }, { status: 500 });
  }
}
