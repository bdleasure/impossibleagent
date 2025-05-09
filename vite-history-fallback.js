// vite-history-fallback.js
import fs from 'node:fs';
import path from 'node:path';

export default function historyFallback() {
  return {
    name: 'vite-history-fallback',
    configureServer(server) {
      return () => {
        server.middlewares.use((req, res, next) => {
          // Skip if the request is for a file with an extension
          if (req.url.includes('.')) {
            return next();
          }

          // Skip API requests
          if (req.url.startsWith('/api')) {
            return next();
          }

          // Serve index.html for all other requests
          const indexHtml = fs.readFileSync(
            path.resolve(process.cwd(), 'index.html'),
            'utf-8'
          );
          
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html');
          res.end(indexHtml);
        });
      };
    }
  };
}
