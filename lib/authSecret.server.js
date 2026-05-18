import "server-only";

/**
 * @param {Request} request
 * @param {{ password?: string } | null} body
 */
export function verifyUploadSecret(request, body) {
  const secret =
    process.env.ROSTER_UPLOAD_SECRET || process.env.SHARE_UPLOAD_SECRET;
  if (!secret) return true;
  const provided =
    body?.password || request.headers.get("x-share-secret");
  return provided === secret;
}
