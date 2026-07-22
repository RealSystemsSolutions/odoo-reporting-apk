import axios from "axios";
import { Platform } from "react-native";
import type { OdooUser } from "@/types/odoo.types";
import { logger } from "@/utils/logger";

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
 * Fetches the list of available databases from an Odoo instance.
 */
export async function fetchDatabases(tenantUrl: string): Promise<string[]> {
  const originalUrl = `${tenantUrl.replace(/\/$/, "")}/web/database/list`;
  let url = originalUrl;
  let headers: Record<string, string> = { "Content-Type": "application/json" };

  /* if (Platform.OS === 'web') {
    url = '/.netlify/functions/proxy';
    headers['x-target-url'] = originalUrl;
  } */

  const response = await axios.post(
    url,
    { jsonrpc: "2.0", method: "call", id: 1, params: {} },
    { timeout: 10_000, headers },
  );
  const body = response.data as Record<string, unknown>;
  if (Array.isArray(body.result)) return body.result as string[];
  return [];
}

/**
 * Authenticates against an Odoo instance using the JSON-RPC session endpoint.
 * Returns an OdooUser ready to be saved in the Zustand store.
 */
export async function authenticate(
  params: AuthenticateParams,
): Promise<OdooUser> {
  const { tenantUrl, db, login, password } = params;

  const originalUrl = `${tenantUrl.replace(/\/$/, "")}/web/session/authenticate`;
  let url = originalUrl;
  let headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/plain, */*",
  };

  /* if (Platform.OS === 'web') {
    url = '/.netlify/functions/proxy';
    headers['x-target-url'] = originalUrl;
  } */

  logger.info("AUTH", "Sending authenticate request", { url, db, login });

  let data: unknown;
  try {
    const response = await axios.post(
      url,
      {
        jsonrpc: "2.0",
        method: "call",
        id: 1,
        params: { db, login, password },
      },
      {
        timeout: 15_000,
        headers,
      },
    );
    data = response.data;
    logger.info("AUTH", "Response received", {
      status: response.status,
      hasResult: !!(response.data as Record<string, unknown>)?.result,
      hasError: !!(response.data as Record<string, unknown>)?.error,
    });
  } catch (e) {
    logger.error("AUTH", "Network error during authentication", {
      error: String(e),
    });
    throw e;
  }

  const body = data as Record<string, unknown>;

  if (body.error) {
    const errMsg = (body.error as Record<string, unknown>)?.data
      ? ((
          (body.error as Record<string, unknown>).data as Record<
            string,
            unknown
          >
        )?.message as string)
      : "Error de autenticación";
    logger.error("AUTH", "Odoo returned error", { error: errMsg });
    throw new Error(errMsg ?? "Error de autenticación");
  }

  const result = body.result as OdooSessionResponse;

  if (!result?.uid) {
    logger.error("AUTH", "No uid in result — bad credentials");
    throw new Error("Credenciales incorrectas");
  }

  logger.info("AUTH", "Authentication successful", {
    uid: result.uid,
    name: result.name,
    hasSessionId: !!result.session_id,
  });

  return {
    uid: result.uid,
    name: result.name,
    sessionId: result.session_id,
    tenant: { url: tenantUrl.replace(/\/$/, ""), db },
  };
}
