// vite-spa-plugin.d.ts
declare module './vite-spa-plugin' {
  export default function viteSpaPlugin(): {
    name: string;
    configureServer(server: any): () => void;
  };
}
