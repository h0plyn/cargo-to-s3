# cargo-to-s3

Script to backup your Cargo Collective project to S3 while retaining the file structure

## Usage

Set your `CARGO_SITEMAP_PATH` and `S3_FOLDER` environment variables in `.env`

Set your AWS keys in your shell

To install dependencies:

```bash
bun install
```

To run:

Get your sitemap from cargo:

```bash
bun run get-sitemap.js
```

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.0.25. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
