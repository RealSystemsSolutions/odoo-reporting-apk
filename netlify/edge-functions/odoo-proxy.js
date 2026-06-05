/**
 * Netlify Edge Function: odoo-proxy
 *
 * Intercepts /api/odoo/* requests at the CDN edge and forwards them
 * server-to-server to the user's Odoo instance.
 *
 * Why this works for Safari ITP:
 *   - Browser sends request to same Netlify origin → no third-party context
 *   - Deno fetch inside the edge function has no browser cookie restrictions
 *   - session_id travels in the URL query string to Odoo
 */
export default async (request) => {
  const targetBase = request.headers.get('x-odoo-base-url');

  if (!targetBase || !/^https?:\/\/.+/.test(targetBase)) {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid X-Odoo-Base-Url header' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Strip /api/odoo prefix to get the real Odoo endpoint path
  const url = new URL(request.url);
  const odooPath = url.pathname.replace(/^\/api\/odoo/, '') || '/';
  const targetUrl = `${targetBase.replace(/\/$/, '')}${odooPath}${url.search}`;

  const isBodyMethod = !['GET', 'HEAD'].includes(request.method);
  const requestBody = isBodyMethod ? await request.text() : null;

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: requestBody,
    });

    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Proxy error', message: String(err) }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
