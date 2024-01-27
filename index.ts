import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { XMLParser } from 'fast-xml-parser';
import { parseArgs } from 'util';

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

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    disk: {
      type: 'boolean',
    },
  },
  strict: true,
  allowPositionals: true,
});

const file = Bun.file('pages-without-images.txt');
const writer = file.writer();
const parser = new XMLParser();

if (!process.env.CARGO_SITEMAP_PATH) {
  throw new Error('Set your CARGO_SITEMAP_PATH env var in .env');
}
if (!process.env.S3_BUCKET && !values.disk) {
  throw new Error('Set your S3_BUCKET env var in .env');
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
      s3Folder: getEndOfPath(url.loc).toLowerCase(),
      images: url['image:image'].flatMap((image) => image['image:loc']),
    };
  })
  .filter(Boolean);

const bucket = process.env.S3_BUCKET;
const s3Client = new S3Client({});

console.log(`preparing to save files to ${values.disk ? 'disk' : 's3'}`);
for (const page of parsePageData) {
  if (!page) continue;

  const promises = [];

  console.log(`starting job: ${page.s3Folder}`);
  for (const image of page.images) {
    let backup;

    try {
      console.log(`downloading ${getEndOfPath(image)}...`);
      const response = await fetch(image);
      const buffer = await response.arrayBuffer();

      if (values.disk) {
        backup = Bun.write(
          `cargo-archive/${page.s3Folder}/${getEndOfPath(image)}.jpg`,
          buffer
        );
      } else {
        const s3Buffer = Buffer.from(buffer);
        const params = {
          Bucket: bucket,
          Key: `${page.s3Folder}/${getEndOfPath(image)}`,
          Body: s3Buffer,
        };
        backup = s3Client.send(new PutObjectCommand(params));
      }
      promises.push(backup);
    } catch (e) {
      console.error(`ERROR: failed at ${page.s3Folder}/${getEndOfPath(image)}`);
      console.error(e);
    }
  }

  console.log(
    `${values.disk ? 'saving job' : 'uploading job'} ${page.s3Folder} to ${
      values.disk ? 'disk' : 's3'
    }`
  );
  await Promise.all(promises);
  console.log(`completed job ${page.s3Folder}`);
}

console.log(`backup to ${values.disk ? 'disk' : 's3'} complete`);

writer.end();

function getEndOfPath(path: string) {
  const split = path.split('/');
  return split[split.length - 1];
}
