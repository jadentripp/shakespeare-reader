// Production build script using Bun's bundler with Tailwind plugin
import tailwind from 'bun-plugin-tailwind'

const result = await Bun.build({
  entrypoints: ['./index.html'],
  outdir: './dist',
  target: 'browser',
  minify: true,
  sourcemap: 'linked',
  plugins: [tailwind],
})

if (!result.success) {
  console.error('Build failed:')
  for (const log of result.logs) {
    console.error(log)
  }
  process.exit(1)
}

console.log('Build succeeded:')
for (const output of result.outputs) {
  const size =
    output.size > 1024 * 1024
      ? `${(output.size / 1024 / 1024).toFixed(2)} MB`
      : `${(output.size / 1024).toFixed(2)} KB`
  console.log(`  ${output.path.replace(process.cwd() + '/', '')} (${size})`)
}
