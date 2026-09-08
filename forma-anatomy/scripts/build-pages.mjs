import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cli=fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url));
const config=JSON.parse(await fs.readFile('wrangler.jsonc','utf8'));
if(!config.compatibility_date||!config.compatibility_flags?.includes('nodejs_compat'))throw Error('wrangler.jsonc must declare compatibility_date and nodejs_compat');
// Unlike pages dev/deploy, the standalone functions build command needs these
// flags explicitly. Read them from the same root config to prevent drift.
const result=spawnSync(process.execPath,[cli,'pages','functions','build','functions',
 '--outdir','work/pages-functions','--compatibility-date',config.compatibility_date,
 '--compatibility-flags',...config.compatibility_flags],{stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status??1);
