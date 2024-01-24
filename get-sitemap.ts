import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser();

if (!process.env.CARGO_SITEMAP_PATH) {
  throw new Error('Set your Cargo sitemap path env var in .env');
}
const sitemap = await fetch(process.env.CARGO_SITEMAP_PATH);

const xmlData = await sitemap.text();
const xmlToObj = parser.parse(xmlData);

await Bun.write(
  'sitemap.js',
  `export const sitemap = ${JSON.stringify(xmlToObj)}`
);
