// vite-spa-plugin.js
export default function viteSpaPlugin() {
  return {
    name: 'vite-spa-plugin',
    configureServer(server) {
      return () => {
        server.middlewares.use((req, res, next) => {
          // If the URL doesn't have a file extension, serve index.html
          if (!req.url.includes('.')) {
            req.url = '/';
          }
          next();
        });
      };
    }
  };
}
