import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { IMPORT_KINDS } from '../lib/import/catalog';
import { toCsv, toXlsx, toXlsxAll } from '../lib/import/parse';

const outDir = join(process.cwd(), 'public', 'import-templates');
mkdirSync(outDir, { recursive: true });

async function main() {
  writeFileSync(join(outDir, 'novacrm-import-templates.xlsx'), await toXlsxAll());
  for (const kind of IMPORT_KINDS) {
    writeFileSync(join(outDir, `novacrm-${kind}-template.csv`), toCsv(kind), 'utf8');
    writeFileSync(join(outDir, `novacrm-${kind}-template.xlsx`), await toXlsx(kind));
  }
  console.log(`Wrote templates to ${outDir}`);
}

void main();
