import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { sitemap } from './sitemap';

const file = Bun.file('pages-without-images.txt');
const writer = file.writer();

const parsePageData = sitemap.urlset.url
  .map((url) => {
    if (!url['image:image']) {
      // document pages without images in pages-without-images.txt
      writer.write(`${url.loc}\n`);
      return;
    }

    return {
      origin: url.loc,
      s3Folder: getEndOfPath(url.loc),
      images: url['image:image'].flatMap((image) => image['image:loc']),
    };
  })
  .filter(Boolean);

if (!process.env.S3_BUCKET) {
  throw new Error('Set your S3_BUCKET env var in .env');
}
const bucket = process.env.S3_BUCKET;
const s3Client = new S3Client({});

for (const page of parsePageData) {
  if (!page) continue;

  for (const image of page.images) {
    try {
      const response = await fetch(image);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const params = {
        Bucket: bucket,
        Key: `${page.s3Folder}/${getEndOfPath(image)}`,
        Body: buffer,
      };
      console.log(`uploading ${page.s3Folder}/${getEndOfPath(image)}...`);
      await s3Client.send(new PutObjectCommand(params));

      console.log('uploaded. sleeping.');
      await sleep(2000);
    } catch (e) {
      console.log(`ERROR: failed at ${page.s3Folder}/${getEndOfPath(image)}`);
      console.error(e);
    }
  }
  console.log(`completed job ${page.s3Folder}`);
}

console.log('upload complete');

writer.end();

function getEndOfPath(path: string) {
  return path.split('/')[path.split('/').length - 1];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
