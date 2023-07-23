import * as esbuild from 'esbuild';

esbuild.buildSync({
  entryPoints: ['src/app.ts'],
  bundle: true,
  outfile: 'dist/app.js',
});