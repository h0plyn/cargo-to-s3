# cargo-to-s3

Script to backup your Cargo Collective project to S3 or save to disk while retaining the file structure.

## Usage

Copy the example env file to env

```bash
cp .env.example .env
```

If you are backing up to S3, set your AWS keys in your shell and create an S3 bucket

Set your `CARGO_SITEMAP_PATH` and `S3_BUCKET` environment variables in `.env`

To install dependencies:

```bash
bun install
```

To run the backup to s3:

```bash
bun run index.ts
```

Or use the `--disk` flag to save to disk:

```bash
bun run index.ts --disk
```

This project was created using `bun init` in bun v1.0.25. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
