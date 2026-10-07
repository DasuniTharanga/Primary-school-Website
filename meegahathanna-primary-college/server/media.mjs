import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { assert, HttpError } from './security.mjs';
import { object, text } from './validation.mjs';

export async function saveUpload(db, cfg, user, input, beforeSave = () => {}) {
  object(input);
  const name = text(input.fileName, 'File name', 1, 180);
  assert(
    typeof input.base64 === 'string' &&
      input.base64.length < 7500000 &&
      /^[A-Za-z0-9+/]*={0,2}$/.test(input.base64),
    400,
    'Invalid file data.',
  );
  let bytes = Buffer.from(input.base64, 'base64');
  assert(
    bytes.length > 0 && bytes.toString('base64') === input.base64,
    400,
    'Invalid file encoding.',
  );
  let mime, ext;
  if (bytes.subarray(0, 5).toString() === '%PDF-') {
    assert(
      bytes.length <= 5 * 1024 * 1024 && bytes.subarray(-1024).includes(Buffer.from('%%EOF')),
      400,
      'Use a valid PDF smaller than 5 MB.',
    );
    mime = 'application/pdf';
    ext = 'pdf';
  } else {
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp =
      bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
    assert(
      png || jpeg || webp,
      400,
      'Choose a JPG, PNG, WebP image or PDF. SVG and executable files are not accepted.',
    );
    assert(bytes.length <= 4 * 1024 * 1024, 400, 'Images must be smaller than 4 MB.');
    try {
      // Decode, resize, rotate and re-encode. This also removes EXIF/GPS metadata.
      bytes = await sharp(bytes, { limitInputPixels: 40000000, animated: false })
        .rotate()
        .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      throw new HttpError(400, 'This image could not be read. Please use another image.');
    }
    mime = 'image/webp';
    ext = 'webp';
  }
  beforeSave();
  const id = randomUUID(),
    storageName = `${id}.${ext}`,
    publicPath = `/media/${storageName}`;
  mkdirSync(cfg.uploadPath, { recursive: true, mode: 0o700 });
  writeFileSync(join(cfg.uploadPath, storageName), bytes, { mode: 0o600, flag: 'wx' });
  db.prepare('INSERT INTO media VALUES(?,?,?,?,?,?,?,?)').run(
    id,
    publicPath,
    storageName,
    name.replace(/["\\/\r\n]/g, '_'),
    mime,
    bytes.length,
    user.id,
    new Date().toISOString(),
  );
  return { path: publicPath, name, mimeType: mime, size: bytes.length };
}

export function isPublishedMedia(db, path) {
  const content = db
    .prepare(
      `SELECT id FROM content WHERE status='published'
    AND (image_path=? OR json_extract(data_json,'$.filePath')=?) LIMIT 1`,
    )
    .get(path, path);
  const settings = db
    .prepare(
      `SELECT id FROM settings WHERE
    json_extract(data_json,'$.heroImage')=? OR json_extract(data_json,'$.logoImage')=?`,
    )
    .get(path, path);
  return Boolean(content || settings);
}
