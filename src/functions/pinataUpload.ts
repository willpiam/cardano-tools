import { sha2_256_sync } from '@harmoniclabs/crypto';

const PINATA_UPLOAD_URL = 'https://uploads.pinata.cloud/v3/files';

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

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

/** SHA-256 digest of raw bytes as lowercase hex (64 chars). */
export function sha256HexFromBytes(bytes: Uint8Array): string {
  return Array.from(sha2_256_sync(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function uploadBytesToPinata(
  jwt: string,
  bytes: Uint8Array,
  filename: string,
  mimeType: string
): Promise<{ cid: string; url: string }> {
  const token = jwt.trim();
  if (!token) throw new Error('Pinata JWT is required.');

  const formData = new FormData();
  const blob = new Blob([bytes], { type: mimeType });
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

export async function uploadJsonToPinata(
  jwt: string,
  bytes: Uint8Array,
  filename: string
): Promise<{ cid: string; url: string }> {
  return uploadBytesToPinata(jwt, bytes, filename, 'application/json');
}

export interface PinataImageUploadResult {
  cid: string;
  url: string;
  sha256Hex: string;
  filename: string;
  mimeType: string;
  byteLength: number;
}

/** Upload a profile image to Pinata IPFS; returns ipfs:// URL and file sha256 for CIP-119. */
export async function uploadImageToPinata(
  jwt: string,
  file: File
): Promise<PinataImageUploadResult> {
  const mimeType = file.type.trim();
  if (!mimeType || !ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new Error('Unsupported image type. Use JPEG, PNG, WebP, or GIF.');
  }
  if (file.size <= 0) {
    throw new Error('Image file is empty.');
  }
  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error(`Image is too large (max ${MAX_PROFILE_IMAGE_BYTES / (1024 * 1024)} MB).`);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sha256Hex = sha256HexFromBytes(bytes);
  const safeName = file.name.trim() || `drep-profile-${Date.now()}.img`;
  const uploaded = await uploadBytesToPinata(jwt, bytes, safeName, mimeType);

  return {
    cid: uploaded.cid,
    url: uploaded.url,
    sha256Hex,
    filename: safeName,
    mimeType,
    byteLength: bytes.length,
  };
}
