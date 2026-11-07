import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

register('./test-hooks.mjs', import.meta.url)
