/**
 * Netlify Function: odoo-proxy
 *
 * Dynamic same-origin proxy for Odoo API calls.
 * Solves Safari ITP: the browser sends requests to the same Netlify origin
 * (/api/odoo/*) so there are no third-party cookies. This function receives
 * those requests and forwards them server-to-server to the user's Odoo instance.
 *
 * The target Odoo URL comes from the X-Odoo-Base-Url header set by getOdooClient()
 * in odoo.service.ts when Platform.OS === "web".
 */
const https = require('https');
const http = require('http');

exports.handler = async (event) => {
  const targetBase = (event.headers['x-odoo-base-url'] || '').trim();

  if (!targetBase || !/^https?:\/\/.+/.test(targetBase)) {
    console.error('[odoo-proxy] Missing or invalid X-Odoo-Base-Url header:', targetBase);
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing or invalid X-Odoo-Base-Url header' }),
    };
  }

  // event.rawUrl is the full original request URL before the redirect rule was applied.
  // e.g. https://swicpos-pocketapp.netlify.app/api/odoo/web/dataset/call_kw?session_id=xxx
  let odooPath = '/';
  let odooSearch = '';

  try {
    const requestUrl = new URL(event.rawUrl);
    odooPath = requestUrl.pathname.replace(/^\/api\/odoo/, '') || '/';
    odooSearch = requestUrl.search; // "?session_id=xxx" or ""
  } catch {
    // Fallback: reconstruct from event.path / event.rawQuery
    const rawPath = (event.path || '/').replace(/^\/api\/odoo/, '') || '/';
    odooPath = rawPath;
    odooSearch = event.rawQuery ? `?${event.rawQuery}` : '';
  }

  const targetUrl = `${targetBase.replace(/\/$/, '')}${odooPath}${odooSearch}`;
  const requestBody = event.body || '';
  const isBodyMethod = !['GET', 'HEAD'].includes(event.httpMethod);

  console.log(`[odoo-proxy] ${event.httpMethod} ${targetUrl}`);

  return new Promise((resolve) => {
    try {
      const parsed = new URL(targetUrl);
      const lib = parsed.protocol === 'https:' ? https : http;

      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: event.httpMethod,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 20000,
      };

      if (isBodyMethod && requestBody) {
        options.headers['Content-Length'] = Buffer.byteLength(requestBody).toString();
      }

      const req = lib.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk.toString(); });
        res.on('end', () => {
          console.log(`[odoo-proxy] ← ${res.statusCode} (${body.length} bytes)`);
          resolve({
            statusCode: res.statusCode || 200,
            headers: { 'Content-Type': 'application/json' },
            body,
          });
        });
      });

      req.on('error', (err) => {
        console.error('[odoo-proxy] Network error:', err.message);
        resolve({
          statusCode: 502,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Network error', message: err.message }),
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          statusCode: 504,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Odoo server timeout' }),
        });
      });

      if (isBodyMethod && requestBody) {
        req.write(requestBody);
      }
      req.end();
    } catch (err) {
      console.error('[odoo-proxy] Setup error:', err.message);
      resolve({
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Internal proxy error', message: err.message }),
      });
    }
  });
};
