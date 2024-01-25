import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { XMLParser } from 'fast-xml-parser';

type ISitemap = {
  urlset: {
    url: (
      | {
          loc: string;
          lastmod: string;
          changefreq: string;
          priority: number;
          'image:image'?: undefined;
        }
      | {
          loc: string;
          lastmod: string;
          changefreq: string;
          priority: number;
          'image:image': {
            'image:loc': string;
          }[];
        }
    )[];
  };
};

const file = Bun.file('pages-without-images.txt');
const writer = file.writer();
const parser = new XMLParser();

if (!process.env.CARGO_SITEMAP_PATH || !process.env.S3_BUCKET) {
  throw new Error('Set your env vars in .env');
}
const sitemap = await fetch(process.env.CARGO_SITEMAP_PATH);

const xmlData = await sitemap.text();
const xmlToObj: ISitemap = parser.parse(xmlData);

const parsePageData = xmlToObj.urlset.url
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

const bucket = process.env.S3_BUCKET;
const s3Client = new S3Client({});

for (const page of parsePageData) {
  if (!page) continue;

  const promises = [];

  console.log(`starting job: ${page.s3Folder}`);
  for (const image of page.images) {
    try {
      console.log(`downloading ${getEndOfPath(image)}...`);
      const response = await fetch(image).then((res) => res.arrayBuffer());
      const buffer = Buffer.from(response);

      const params = {
        Bucket: bucket,
        Key: `${page.s3Folder}/${getEndOfPath(image)}`,
        Body: buffer,
      };
      promises.push(s3Client.send(new PutObjectCommand(params)));
    } catch (e) {
      console.log(`ERROR: failed at ${page.s3Folder}/${getEndOfPath(image)}`);
      console.error(e);
    }
  }

  console.log(`uploading job ${page.s3Folder} to s3`);
  await Promise.all(promises);

  console.log(`completed job ${page.s3Folder}`);
}

console.log('backup to s3 complete');

writer.end();

function getEndOfPath(path: string) {
  const split = path.split('/');
  return split[split.length - 1];
}
