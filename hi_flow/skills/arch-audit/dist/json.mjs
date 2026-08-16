import { createRequire as createRuntimeRequire } from 'node:module';
import { dirname as runtimeDirname } from 'node:path';
import { fileURLToPath as runtimeFileURLToPath } from 'node:url';
const require = createRuntimeRequire(import.meta.url);
const __filename = runtimeFileURLToPath(import.meta.url);
const __dirname = runtimeDirname(__filename);
function n(t){return{output:JSON.stringify(t,null,"  ")+`
`,exitCode:0}}export{n as default};
