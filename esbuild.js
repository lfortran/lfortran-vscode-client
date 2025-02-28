import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

let production = process.argv.includes('--production');
if (process.env.LFORTRAN_LSP_MODE === "debug") {
  production = false;
}

async function main() {
  const ctx = await esbuild.context({
    entryPoints: [
      'client/src/extension.ts'
    ],
    bundle: true,
    mainFields: [
      'module',
      'main'
    ],
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outdir: 'out',
    external: [
      'vscode'
    ],
    loader: {
      '.node': "copy"
    },
    // logLevel: slient; error; warning; info (default); debug; verbose
    logLevel: 'info',
    plugins: [
      /* add to the end of plugins array */
      esbuildProblemMatcherPlugin
    ]
  });
  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',

  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started');
    });
    build.onEnd(result => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(`    ${location.file}:${location.line}:${location.column}:`);
      });
      console.log('[watch] build finished');
    });
  }
};

main().catch(e => {
  console.error(e);
  process.exit(1);
});
