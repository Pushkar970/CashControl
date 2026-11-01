// @ts-nocheck — system-managed; suppress so project's strict tsc doesn't
// flag orval's Config type.
import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: '../nodejs_space/swagger.json',
    output: {
      target: './src/api/generated/api.ts',
      schemas: './src/api/generated/schemas',
      client: 'react-query',
      mode: 'split',
      clean: true,
      prettier: false,
      override: {
        // Trailing \n is REQUIRED — orval otherwise concatenates the
        // directive onto the first import. Must be a string (array headers
        // get wrapped in /** */).
        header: () => '// @ts-nocheck\n',
        // Return body T directly instead of orval's default
        // { data, status, headers } wrapper — matches customFetch.
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          path: './src/api/customFetch.ts',
          name: 'customFetch',
        },
      },
    },
  },
});