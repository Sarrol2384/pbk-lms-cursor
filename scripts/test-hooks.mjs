import { existsSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const srcRoot = fileURLToPath(new URL('../src/', import.meta.url))

function resolveFile(basePath) {
  const candidates = [basePath, `${basePath}.ts`, `${basePath}.tsx`, `${basePath}.js`, join(basePath, 'index.ts')]
  return candidates.find(file => existsSync(file) && statSync(file).isFile()) ?? null
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const file = resolveFile(join(srcRoot, specifier.slice(2)))
    if (file) return nextResolve(pathToFileURL(file).href, context)
  }
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    const file = resolveFile(join(dirname(fileURLToPath(context.parentURL)), specifier))
    if (file) return nextResolve(pathToFileURL(file).href, context)
  }
  return nextResolve(specifier, context)
}
