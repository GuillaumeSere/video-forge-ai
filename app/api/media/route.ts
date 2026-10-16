import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const mediaDirectory = path.join(process.cwd(), 'storage', 'media');
const supportedTypes: Record<string, { extension: string; type: 'image' | 'video' }> = {
  'image/jpeg': { extension: 'jpg', type: 'image' },
  'image/png': { extension: 'png', type: 'image' },
  'image/webp': { extension: 'webp', type: 'image' },
  'video/mp4': { extension: 'mp4', type: 'video' },
  'video/webm': { extension: 'webm', type: 'video' },
};

function hasExpectedSignature(type: string, bytes: Buffer) {
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === 'image/webp') return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (type === 'video/mp4') return bytes.toString('ascii', 4, 8) === 'ftyp';
  if (type === 'video/webm') return bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  return false;
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_FILE_SIZE + 1024 * 1024) {
    return Response.json({ error: 'Le fichier dépasse la limite de 25 Mo.' }, { status: 413 });
  }

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return Response.json({ error: 'Sélectionnez un fichier image ou vidéo.' }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return Response.json({ error: 'Le fichier doit peser entre 1 octet et 25 Mo.' }, { status: 413 });
    }

    const media = supportedTypes[file.type];
    if (!media) {
      return Response.json({ error: 'Formats acceptés : JPG, PNG, WebP, MP4 et WebM.' }, { status: 415 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (!hasExpectedSignature(file.type, bytes)) {
      return Response.json({ error: 'Le contenu ne correspond pas au format déclaré.' }, { status: 415 });
    }

    const id = randomUUID();
    await mkdir(mediaDirectory, { recursive: true });
    await writeFile(path.join(mediaDirectory, `${id}.${media.extension}`), bytes, { flag: 'wx' });

    return Response.json({ id, type: media.type, mimeType: file.type, url: `/api/media?id=${id}` }, { status: 201 });
  } catch (error) {
    console.error('Media upload error:', error);
    return Response.json({ error: 'Le fichier n’a pas pu être enregistré.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return Response.json({ error: 'Identifiant de média invalide.' }, { status: 400 });
  }

  for (const [mimeType, media] of Object.entries(supportedTypes)) {
    try {
      const content = await readFile(path.join(mediaDirectory, `${id}.${media.extension}`));
      return new Response(content, {
        headers: {
          'content-type': mimeType,
          'content-length': String(content.byteLength),
          'cache-control': 'private, max-age=3600',
          'x-content-type-options': 'nosniff',
          'content-disposition': 'inline',
        },
      });
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
    }
  }

  return Response.json({ error: 'Média introuvable.' }, { status: 404 });
}
