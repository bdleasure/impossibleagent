// vite-history-fallback.d.ts
declare module './vite-history-fallback' {
  export default function historyFallback(): {
    name: string;
    configureServer(server: any): () => void;
  };
}
