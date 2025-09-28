// supabase/functions/nessie-admin/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-id",
};

type NessieAction =
  | "create_customer"
  | "ensure_customer"
  | "create_account"
  | "create_merchant"
  | "create_purchase"
  | "whoami"
  | "ping";

interface NessieRequest {
  action: NessieAction;
  // optional payload
  user_id?: string;
  customer_id?: string;
  account_id?: string;
  merchant_id?: string;
  merchant_name?: string;
  description?: string;
  amount?: number;
  type?: "Checking" | "Savings";
  nickname?: string;
}

interface NessieResponse {
  ok: boolean;
  mode: "live" | "mock" | "error";
  error?: string;
  data?: any;
  nessie_customer_id?: string;
  nessie_account_id?: string;
  nessie_merchant_id?: string;
  nessie_purchase_id?: string;
  debug_info?: {
    attempts: number;
    urls_tried: string[];
    final_error: string;
  };
}

/* ───────────────────────────────────────────────────────────
   Env
   ─────────────────────────────────────────────────────────── */
function must(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const SUPABASE_URL = must("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = must("SUPABASE_SERVICE_ROLE_KEY");
const NESSIE_KEY = must("NESSIE_KEY");
const NESSIE_PROXY_BASE = Deno.env.get("NESSIE_PROXY_BASE") || "";
const MOCK_ON_NESSIE_DOWN =
  (Deno.env.get("MOCK_ON_NESSIE_DOWN") || "false").toLowerCase() === "true";

/* ───────────────────────────────────────────────────────────
   HTTP client with retry + HTTPS→HTTP fallback
   ─────────────────────────────────────────────────────────── */
class NessieClient {
  constructor(
    private readonly nessieKey: string,
    private readonly proxyBase?: string,
    private readonly mockMode: boolean = false
  ) {}

  private baseUrls(): string[] {
    if (this.proxyBase) return [this.proxyBase];
    return [
      "https://api.nessieisreal.com",
      "http://api.nessieisreal.com", // fallback if 443 is refusing
    ];
  }

  private isTransient(err: unknown) {
    const s = String((err as any)?.message || err || "").toLowerCase();
    return (
      s.includes("failed to fetch") ||
      s.includes("connection refused") ||
      s.includes("connect error") ||
      s.includes("timed out") ||
      s.includes("network") ||
      s.includes("econnreset")
    );
  }

  private async attempt(url: string, init: RequestInit, ms = 1200) {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), ms);
    try {
      return await fetch(url, { ...init, signal: ctl.signal });
    } finally {
      clearTimeout(to);
    }
  }

  // Normalizes id field from Nessie responses
  private extractId(obj: any): string | null {
    return obj?.objectCreated?._id || obj?._id || obj?.id || null;
  }

  async makeRequest(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    body?: any
  ): Promise<NessieResponse> {
    const urls = this.baseUrls();
    const tried: string[] = [];
    let lastErr: any = null;
    let attempts = 0;

    for (const base of urls) {
      for (let i = 0; i < 3; i++) {
        attempts++;
        const url = `${base}${endpoint}${
          endpoint.includes("?") ? "&" : "?"
        }key=${this.nessieKey}`;
        tried.push(url);

        try {
          const init: RequestInit = {
            method,
            headers: { "Content-Type": "application/json" },
            body:
              body && method !== "GET" ? JSON.stringify(body) : undefined,
          };
          const res = await this.attempt(url, init, 800 + i * 400);
          const text = await res.text();
          let json: any = {};
          try {
            json = text ? JSON.parse(text) : {};
          } catch {
            json = { raw: text };
          }
          if (!res.ok) {
            const msg = json?.message || json?.error || `HTTP ${res.status}`;
            lastErr = new Error(msg);
            // do not retry on 4xx
            if (res.status >= 400 && res.status < 500) {
              return {
                ok: false,
                mode: "live",
                error: msg,
                data: json,
                debug_info: { attempts, urls_tried: tried, final_error: msg },
              };
            }
            // transient? retry loop continues
          } else {
            // success; normalize id fields
            const out: NessieResponse = {
              ok: true,
              mode: "live",
              data: json,
              debug_info: { attempts, urls_tried: tried, final_error: "none" },
            };
            const id = this.extractId(json);
            if (method === "POST") {
              if (endpoint.startsWith("/customers")) {
                out.nessie_customer_id = id || undefined;
              } else if (endpoint.includes("/accounts")) {
                out.nessie_account_id = id || undefined;
              } else if (endpoint.startsWith("/merchants")) {
                out.nessie_merchant_id = id || undefined;
              } else if (endpoint.includes("/purchases")) {
                out.nessie_purchase_id = id || undefined;
              }
            }
            return out;
          }
        } catch (e) {
          lastErr = e;
          if (!this.isTransient(e)) {
            // non-transient: bail
            return {
              ok: false,
              mode: "live",
              error: String((e as any)?.message || e),
              debug_info: {
                attempts,
                urls_tried: tried,
                final_error: String((e as any)?.message || e),
              },
            };
          }
          // backoff
          await new Promise((r) => setTimeout(r, 200 * (i + 1)));
        }
      }
    }

    // All attempts failed
    if (this.mockMode) {
      // Construct a reasonable mock id based on endpoint
      const base = endpoint.split("?")[0];
      const mk = (p: string) =>
        `${p}_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
      const resp: NessieResponse = {
        ok: true,
        mode: "mock",
        data: { message: "mock", endpoint, method, body },
        debug_info: {
          attempts,
          urls_tried: tried,
          final_error: String(lastErr?.message || "unknown"),
        },
      };
      if (base.startsWith("/customers")) resp.nessie_customer_id = mk("mockcus");
      else if (base.includes("/accounts")) resp.nessie_account_id = mk("mockacct");
      else if (base.startsWith("/merchants")) resp.nessie_merchant_id = mk("mockmrc");
      else if (base.includes("/purchases")) resp.nessie_purchase_id = mk("mocktx");
      return resp;
    }

    return {
      ok: false,
      mode: "live",
      error: String(lastErr?.message || "All attempts failed"),
      debug_info: {
        attempts,
        urls_tried: tried,
        final_error: String(lastErr?.message || "unknown"),
      },
    };
  }
}

/* ───────────────────────────────────────────────────────────
   Supabase helpers
   ─────────────────────────────────────────────────────────── */
async function upsertUserIntegration(
  supabase: ReturnType<typeof createClient>,
  user_id: string,
  nessie_customer_id: string
) {
  const { error } = await supabase.from("user_integrations").upsert(
    {
      user_id,
      nessie_customer_id,
      last_sync: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

async function getMappedCustomerId(
  supabase: ReturnType<typeof createClient>,
  user_id: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_integrations")
    .select("nessie_customer_id")
    .eq("user_id", user_id)
    .maybeSingle();
  if (error) throw error;
  return data?.nessie_customer_id ?? null;
}

/* ───────────────────────────────────────────────────────────
   Handler
   ─────────────────────────────────────────────────────────── */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const client = new NessieClient(NESSIE_KEY, NESSIE_PROXY_BASE || undefined, MOCK_ON_NESSIE_DOWN);

    // Resolve user_id: body → x-user-id → Authorization (optional)
    const raw = (await req.json().catch(() => ({}))) as NessieRequest | any;
    const bodyUserId = typeof raw?.user_id === "string" ? raw.user_id : null;
    const headerUserId = req.headers.get("x-user-id");
    let user_id = bodyUserId || headerUserId || null;

    if (!user_id) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.toLowerCase().startsWith("bearer ")) {
        const token = authHeader.slice(7);
        const { data } = await supabase.auth.getUser(token);
        user_id = data?.user?.id || null;
      }
    }

    const action = (raw?.action || "").trim() as NessieAction;

    // Diagnostics
    if (action === "whoami") {
      return new Response(
        JSON.stringify({
          ok: true,
          mode: "live",
          user_id: user_id ?? null,
          secrets: {
            SUPABASE_URL: !!SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
            NESSIE_KEY: !!NESSIE_KEY,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (action === "ping") {
      const res = await client.makeRequest("/customers", "GET");
      return new Response(JSON.stringify(res), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!user_id) {
      return new Response(
        JSON.stringify({ ok: false, mode: "error", error: "Missing user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: NessieResponse;

    // Idempotent ensure
    if (action === "ensure_customer") {
      const existing = await getMappedCustomerId(supabase, user_id).catch(() => null);
      if (existing) {
        result = {
          ok: true,
          mode: "live",
          nessie_customer_id: existing,
          data: { _id: existing, message: "Customer already mapped" },
        };
      } else {
        // Create at Nessie
        const created = await client.makeRequest("/customers", "POST", {
          first_name: "Demo",
          last_name: "User",
          address: {
            street_number: "123",
            street_name: "Main St",
            city: "McLean",
            state: "VA",
            zip: "22102",
          },
        });
        if (!created.ok) {
          return new Response(JSON.stringify(created), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const cid =
          created.nessie_customer_id ||
          created.data?.objectCreated?._id ||
          created.data?._id ||
          created.data?.id ||
          null;
        if (!cid) {
          return new Response(
            JSON.stringify({ ok: false, mode: created.mode, error: "Customer id not returned", data: created.data }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Persist mapping
        await upsertUserIntegration(supabase, user_id, cid);
        result = { ok: true, mode: created.mode, nessie_customer_id: cid, data: created.data, debug_info: created.debug_info };
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create_customer") {
      const created = await client.makeRequest("/customers", "POST", {
        first_name: "Demo",
        last_name: "User",
        address: {
          street_number: "123",
          street_name: "Main St",
          city: "McLean",
          state: "VA",
          zip: "22102",
        },
      });
      if (!created.ok) {
        return new Response(JSON.stringify(created), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const cid =
        created.nessie_customer_id ||
        created.data?.objectCreated?._id ||
        created.data?._id ||
        created.data?.id ||
        null;
      if (cid) {
        await upsertUserIntegration(supabase, user_id, cid);
      }
      const out: NessieResponse = {
        ok: true,
        mode: created.mode,
        data: created.data,
        nessie_customer_id: cid || undefined,
        debug_info: created.debug_info,
      };
      return new Response(JSON.stringify(out), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create_account") {
      const customer_id =
        (raw?.customer_id as string) ||
        (await getMappedCustomerId(supabase, user_id)) ||
        null;
      if (!customer_id) {
        return new Response(
          JSON.stringify({ ok: false, mode: "error", error: "Failed to create customer" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const type = (raw?.type as "Checking" | "Savings") || "Checking";
      const nickname = (raw?.nickname as string) || (type === "Savings" ? "Savings" : "Demo Account");
      const starting_balance = Number(raw?.amount ?? 1000);

      const created = await client.makeRequest(
        `/customers/${customer_id}/accounts`,
        "POST",
        { type, nickname, rewards: 0, balance: starting_balance }
      );
      return new Response(JSON.stringify(created), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create_merchant") {
      const name = (raw?.merchant_name as string) || "Demo Merchant";
      const created = await client.makeRequest("/merchants", "POST", {
        name,
        // nessie sandbox ignores/varies category; omit to avoid 400s
        address: {
          street_number: "456",
          street_name: "Commerce Ave",
          city: "McLean",
          state: "VA",
          zip: "22102",
        },
        geocode: { lat: 38.9338, lng: -77.1668 },
      });
      return new Response(JSON.stringify(created), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create_purchase") {
      const account_id = raw?.account_id as string | undefined;
      const merchant_id = raw?.merchant_id as string | undefined;
      if (!account_id || !merchant_id) {
        return new Response(
          JSON.stringify({ ok: false, mode: "error", error: "account_id and merchant_id required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const amount = Number(raw?.amount ?? 10);
      const description = (raw?.description as string) || "Demo Purchase";

      const created = await client.makeRequest(
        `/accounts/${account_id}/purchases`,
        "POST",
        {
          merchant_id,
          medium: "balance",
          purchase_date: new Date().toISOString().slice(0, 10),
          amount,
          description,
          status: "pending",
        }
      );
      return new Response(JSON.stringify(created), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Unknown action
    return new Response(
      JSON.stringify({
        ok: false,
        mode: "error",
        error:
          "Unknown action. Use one of: ensure_customer | create_customer | create_account | create_merchant | create_purchase | whoami | ping",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("nessie-admin error:", error);
    return new Response(
      JSON.stringify({ ok: false, mode: "error", error: String((error as any)?.message || error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
