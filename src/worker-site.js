import { getAssetFromKV } from '@cloudflare/kv-asset-handler'

/**
 * The DEBUG flag will do two things:
 * 1. We will skip caching on the edge, making it easier to debug
 * 2. We will return an error message on exception in your Response
 */
const DEBUG = false

/**
 * Handle all requests to serve static assets or redirect to index.html for SPA routes
 */
async function handleRequest(event) {
  const url = new URL(event.request.url)
  let options = {}

  try {
    if (DEBUG) {
      options.cacheControl = {
        bypassCache: true,
      }
    }

    // Try to get the static asset (CSS, JS, images, etc.)
    const page = await getAssetFromKV(event, options)
    
    // Allow headers to be altered
    const response = new Response(page.body, page)
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('Referrer-Policy', 'unsafe-url')
    response.headers.set('Feature-Policy', 'none')

    return response
  } catch (e) {
    // If an error is thrown while trying to serve a static file,
    // it could be because it's actually a route managed by the SPA
    // Instead of returning 404, we'll serve the index.html
    try {
      const notFoundResponse = await getAssetFromKV(event, {
        mapRequestToAsset: req => new Request(`${new URL(req.url).origin}/index.html`, req),
      })

      return new Response(notFoundResponse.body, {
        ...notFoundResponse,
        status: 200, // We return 200 instead of 404 since this is the SPA routing
      })
    } catch (e) {
      return new Response('An unexpected error occurred', { status: 500 })
    }
  }
}

/**
 * Main Worker event handler
 */
export default {
  async fetch(request, env, ctx) {
    // Check if this is an API request for our agent
    const url = new URL(request.url)
    
    // If it's a request to our API endpoints, let the server.js handle it
    if (url.pathname.startsWith('/api/') || 
        url.pathname === '/check-open-ai-key' ||
        url.pathname.includes('ws')) {
      // Pass through to the original worker handler
      return env.WORKER.fetch(request)
    }
    
    // Otherwise handle as a static asset or SPA route
    return handleRequest({ request, waitUntil: ctx.waitUntil.bind(ctx) })
  }
}
