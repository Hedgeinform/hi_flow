import { createRequire as createRuntimeRequire } from 'node:module';
const require = createRuntimeRequire(import.meta.url);
function n(t){return{output:JSON.stringify(t,null,"  ")+`
`,exitCode:0}}export{n as default};
