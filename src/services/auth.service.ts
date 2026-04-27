import axios from 'axios';
import type { OdooUser } from '@/types/odoo.types';

interface AuthenticateParams {
  tenantUrl: string;
  db: string;
  login: string;
  password: string;
}

interface OdooSessionResponse {
  uid: number;
  name: string;
  session_id: string;
  db: string;
}

/**
 * Authenticates against an Odoo instance using the JSON-RPC session endpoint.
 * Returns an OdooUser ready to be saved in the Zustand store.
 */
export async function authenticate(params: AuthenticateParams): Promise<OdooUser> {
  const { tenantUrl, db, login, password } = params;

  const url = `${tenantUrl.replace(/\/$/, '')}/web/session/authenticate`;

  const { data } = await axios.post(
    url,
    {
      jsonrpc: '2.0',
      method: 'call',
      id: 1,
      params: { db, login, password },
    },
    {
      timeout: 15_000,
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*'
      },
    }
  );

  if (data.error) {
    console.log("Error de autenticación",data.error);
    throw new Error(data.error.data?.message ?? 'Error de autenticación');
  }

  const result: OdooSessionResponse = data.result;

  if (!result?.uid) {
    throw new Error('Credenciales incorrectas');
  }

  return {
    uid: result.uid,
    name: result.name,
    sessionId: result.session_id,
    tenant: { url: tenantUrl.replace(/\/$/, ''), db },
  };
}
