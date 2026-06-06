import { Handler } from '@netlify/functions';
import axios from 'axios';

export const handler: Handler = async (event, context) => {
  // Configuración de CORS permitiendo acceso desde cualquier origen 
  // (aunque en producción Netlify ya corre bajo el mismo origen de la web, 
  // esto es seguro porque es un proxy que solo la web utilizará).
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-target-url, x-session-id',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };

  // Respuesta al Preflight request de CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const targetUrl = event.headers['x-target-url'];
    const sessionId = event.headers['x-session-id'];

    if (!targetUrl) {
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ error: 'Missing x-target-url header' }) 
      };
    }

    const odooHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*'
    };

    // Si el navegador envía la cookie directamente (ya que estamos en el mismo dominio), la capturamos
    const incomingCookie = event.headers['cookie'] || event.headers['Cookie'];
    if (incomingCookie) {
      odooHeaders['Cookie'] = incomingCookie;
    }

    // Si tenemos session_id explícito desde Zustand (nuestro custom header),
    // se la enviamos a Odoo como una Cookie, sobrescribiendo si es necesario.
    if (sessionId) {
      // Si ya había otras cookies, agregamos el session_id a la cadena, sino la creamos.
      odooHeaders['Cookie'] = odooHeaders['Cookie'] 
        ? `${odooHeaders['Cookie']}; session_id=${sessionId}`
        : `session_id=${sessionId}`;
    }

    const body = event.body ? JSON.parse(event.body) : undefined;

    const response = await axios({
      method: event.httpMethod,
      url: targetUrl,
      data: body,
      headers: odooHeaders,
      // No arrojar error por status HTTP (4xx o 5xx) para propagarlo transparentemente
      validateStatus: () => true,
    });

    // Odoo 16+ ya no devuelve el session_id en el payload JSON, solo en la cookie.
    // Vamos a extraerlo de Set-Cookie y reinyectarlo en el JSON para que el frontend
    // lo siga recibiendo como antes y pueda enviarlo en 'x-session-id'.
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
      for (const cookieStr of cookies) {
        const match = cookieStr.match(/session_id=([^;]+)/);
        if (match && response.data && response.data.result) {
          response.data.result.session_id = match[1];
          break;
        }
      }
    }

    // Además, podemos propagar las cookies de vuelta al navegador por si acaso
    // usando multiValueHeaders (Netlify Functions feature).
    const multiValueHeaders: any = {};
    if (setCookieHeader) {
      multiValueHeaders['Set-Cookie'] = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    }

    return {
      statusCode: response.status,
      headers,
      multiValueHeaders,
      body: JSON.stringify(response.data),
    };
  } catch (error: any) {
    console.error('Odoo Proxy Error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
