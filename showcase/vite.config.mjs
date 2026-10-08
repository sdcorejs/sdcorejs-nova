import {defineConfig} from 'vite';
export default defineConfig({
 root:import.meta.dirname,base:'/sdcorejs-nova/',publicDir:false,
 oxc:{jsx:{runtime:'automatic'}},
 server:{host:'127.0.0.1',port:5193,strictPort:true},
 preview:{host:'127.0.0.1',port:5203,strictPort:true},
 build:{outDir:'dist',emptyOutDir:true,sourcemap:false,assetsInlineLimit:0,license:{fileName:'THIRD_PARTY_BUNDLE_LICENSES.md'}},
});
