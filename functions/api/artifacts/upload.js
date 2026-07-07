export async function onRequestPost(context) {
  const { request } = context;
  const formData = await request.formData();
  const displayName = formData.get('displayName');
  const controlId = formData.get('controlId');
  const file = formData.get('file');

  return Response.json({
    ok: true,
    message: `Scaffold received artifact \"${displayName}\" for control ${controlId}. Connect this route to R2 and the artifacts tables for persistent uploads.`,
    file_name: file?.name ?? null,
    file_size: file?.size ?? null
  });
}
