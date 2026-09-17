// Collects the release files into setup/:
// - the Windows installer built by `npm run package:win`, its .blockmap and
//   latest.yml, which a GitHub release needs for automatic updates;
// - <version>.zip with the project source exactly as Git sees it, so nothing
//   matched by .gitignore (dependencies, build output, secrets) is included.
// electron-builder keeps its working files in artifacts/.
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';

import manifest from '../package.json' with { type: 'json' };

const source = 'artifacts';
const target = 'setup';
const prefix = `Kargonomi-Masaustu-${manifest.version}-`;

const installerFiles = (await readdir(source)).filter((name) =>
  name === 'latest.yml' || (name.startsWith(prefix) && (name.endsWith('.exe') || name.endsWith('.exe.blockmap'))));

if (!installerFiles.some((name) => name.endsWith('.exe'))) {
  throw new Error(`${source}/ içinde ${prefix}*.exe bulunamadı. Önce "npm run package:win" çalıştırın.`);
}

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const name of installerFiles) await copyFile(join(source, name), join(target, name));

// Tracked and untracked files under this directory, minus ignored ones.
const listed = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
const sourceFiles = [];
for (const path of listed.sort()) {
  const info = await stat(path).catch(() => undefined);
  if (info?.isFile()) sourceFiles.push({ path, info });
}

const folder = `Kargonomi-Masaustu-${manifest.version}`;
const archive = `${manifest.version}.zip`;
await writeFile(join(target, archive), zip(await Promise.all(sourceFiles.map(async ({ path, info }) => ({
  name: `${folder}/${path.replaceAll('\\', '/')}`,
  data: await readFile(path),
  modified: info.mtime,
})))));

for (const name of [...installerFiles, archive].sort()) {
  const { size } = await stat(join(target, name));
  console.log(`${target}/${name}  ${(size / 1024 / 1024).toFixed(1)} MB`);
}
console.log(`${archive}: ${String(sourceFiles.length)} dosya`);

// Minimal ZIP writer (deflate, UTF-8 names); the source tree stays far below
// the 4 GB / 65 535 entry limits that would need ZIP64.
function zip(entries) {
  const records = [];
  const directory = [];
  let offset = 0;
  for (const { name, data, modified } of entries) {
    const nameBytes = Buffer.from(name, 'utf8');
    const deflated = deflateRawSync(data, { level: 9 });
    const stored = deflated.length >= data.length;
    const body = stored ? data : deflated;
    const checksum = crc32(data);
    const [time, date] = dosDateTime(modified);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(stored ? 0 : 8, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    records.push(local, nameBytes, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(stored ? 0 : 8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    directory.push(central, nameBytes);

    offset += local.length + nameBytes.length + body.length;
  }
  const directorySize = directory.reduce((total, part) => total + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directorySize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...records, ...directory, end]);
}

function dosDateTime(value) {
  const year = Math.max(value.getFullYear(), 1980);
  const time = (value.getHours() << 11) | (value.getMinutes() << 5) | Math.floor(value.getSeconds() / 2);
  const date = ((year - 1980) << 9) | ((value.getMonth() + 1) << 5) | value.getDate();
  return [time, date];
}
