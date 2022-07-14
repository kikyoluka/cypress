import type { Plugin } from 'vite'
import debugLib from 'debug'
import { usingReactWithLegacyAPI } from '../resolveConfig'

const debug = debugLib('cypress:vite-dev-server:plugins:react18')

/**
 * React 18 has changed it's API.
 * https://reactjs.org/blog/2022/03/08/react-18-upgrade-guide.html#updates-to-client-rendering-apis
 * We need to conditionally import `react-dom/client` in our React adapter:
 *
 *   import('react-dom/client', (mod) => {...})
 *
 * In a browser environment, we can just try/catch, however Vite does some optimizations
 * and will fail during this step if react-dom/client does not exist (React <= 17).
 *
 * To avoid this error and seamlessly support React 17 and 18 side by side we simply
 * remove the react-dom/client import when using older version by rewriting the bundle using
 * Rollup's transform API: https://rollupjs.org/guide/en/#transform (Vite using Rollup internally).
 */

export const React18 = (projectRoot: string): Plugin => {
  return {
    name: 'cypress:rewrite-react-dom-import',
    enforce: 'pre',
    transform (code, id) {
      const isUsingLegacyApi = usingReactWithLegacyAPI(projectRoot)

      debug('is using legacy react version? %s', isUsingLegacyApi)

      if (!isUsingLegacyApi) {
        return
      }

      // TODO: Why do we need to check against cypress-react (dev mode, system tests)
      // AND cypress_react (production)?
      const isCypressReact = id.includes('cypress-react.esm-bundler.js') || id.includes('cypress_react.js')

      debug('is request cypress/react', isCypressReact)

      if (isCypressReact) {
        // remove problematic code via transform!
        debug('transforming cypress/react to remove react-dom/client for backwards compat')

        return code.replace('react-dom/client', 'react-dom')
      }
    },
  }
}
