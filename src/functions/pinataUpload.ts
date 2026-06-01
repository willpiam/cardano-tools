const PINATA_UPLOAD_URL = 'https://uploads.pinata.cloud/v3/files';

interface PinataUploadResponse {
  data?: {
    cid?: string;
  };
  error?: {
    message?: string;
  };
  message?: string;
}

async function readResponseBody(res: Response): Promise<PinataUploadResponse | string> {
  const text = await res.text();
  if (!text) return '';
  try {
    return JSON.parse(text) as PinataUploadResponse;
  } catch {
    return text;
  }
}

function responseMessage(body: PinataUploadResponse | string): string {
  if (typeof body === 'string') return body;
  return body.error?.message || body.message || JSON.stringify(body);
}

export async function uploadJsonToPinata(
  jwt: string,
  bytes: Uint8Array,
  filename: string
): Promise<{ cid: string; url: string }> {
  const token = jwt.trim();
  if (!token) throw new Error('Pinata JWT is required.');

  const formData = new FormData();
  const blob = new Blob([bytes], { type: 'application/json' });
  formData.append('file', blob, filename);
  formData.append('network', 'public');

  const res = await fetch(PINATA_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const body = await readResponseBody(res);
  if (!res.ok) {
    const details = responseMessage(body);
    throw new Error(`Pinata upload failed (${res.status}): ${details}`);
  }

  if (typeof body === 'string' || !body.data?.cid) {
    throw new Error('Pinata upload succeeded but did not return a CID.');
  }

  return {
    cid: body.data.cid,
    url: `ipfs://${body.data.cid}`,
  };
}
