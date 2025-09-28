import { supabase } from './supabase.js';

const NESSIE_BASE_URL = import.meta.env.VITE_NESSIE_BASE_URL ?? 'https://api.nessieisreal.com';
const NESSIE_API_KEY = import.meta.env.VITE_NESSIE_API_KEY;

function buildUrl(path, query = {}) {
  if (!path.startsWith('/')) {
    throw new Error('Nessie API paths must start with a leading slash');
  }

  const url = new URL(path, NESSIE_BASE_URL);
  if (!NESSIE_API_KEY) {
    throw new Error('Missing VITE_NESSIE_API_KEY environment variable');
  }

  url.searchParams.set('key', NESSIE_API_KEY);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

async function request(path, { method = 'GET', body, headers = {}, query } = {}) {
  const response = await fetch(buildUrl(path, query), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const rawPayload = await response.text();
  let payload = null;
  if (rawPayload) {
    try {
      payload = JSON.parse(rawPayload);
    } catch {
      payload = rawPayload;
    }
  }

  if (!response.ok) {
    const error = new Error(
      `Nessie API error (${response.status}): ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function fetchCustomer(customerId) {
  if (!customerId) return null;
  try {
    return await request(`/customers/${customerId}`);
  } catch (error) {
    if (error?.status === 404) {
      return null;
    }
    throw error;
  }
}

async function createCustomerProfile(user) {
  const profile = {
    first_name: user?.user_metadata?.first_name ?? user?.user_metadata?.given_name ?? user?.email?.split('@')[0] ?? 'PPP',
    last_name: user?.user_metadata?.last_name ?? user?.user_metadata?.family_name ?? 'Explorer',
    address: {
      street_number: '1',
      street_name: 'Capital One Way',
      city: 'McLean',
      state: 'VA',
      zip: '22102'
    }
  };

  const customer = await request('/customers', {
    method: 'POST',
    body: profile
  });

  if (!customer?._id) {
    throw new Error('Nessie customer creation did not return an id');
  }

  return customer;
}

async function lookupIntegrationCustomerId(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('user_integrations')
    .select('nessie_customer_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.nessie_customer_id ?? null;
}

export async function persistNessieCustomerId({ userId, customerId, metadata = {} }) {
  if (!userId || !customerId) {
    throw new Error('persistNessieCustomerId requires both userId and customerId');
  }

  const nextMetadata = {
    ...metadata,
    nessieCustomerId: customerId
  };

  const { data: userData, error: authError } = await supabase.auth.updateUser({
    data: nextMetadata
  });

  if (authError) {
    throw authError;
  }

  const { error: integrationError } = await supabase
    .from('user_integrations')
    .upsert({ user_id: userId, nessie_customer_id: customerId }, { onConflict: 'user_id' });

  if (integrationError) {
    throw integrationError;
  }

  return userData?.user ?? null;
}

export async function ensureNessieCustomer(user, { persist = true } = {}) {
  if (!user?.id) {
    throw new Error('ensureNessieCustomer requires an authenticated Supabase user');
  }

  const metadataId = user.user_metadata?.nessieCustomerId ?? null;
  let storedId = metadataId;

  if (!storedId) {
    try {
      storedId = await lookupIntegrationCustomerId(user.id);
    } catch (error) {
      console.warn('Unable to lookup stored Nessie integration', error);
    }
  }

  let existingCustomer = null;
  if (storedId) {
    try {
      existingCustomer = await fetchCustomer(storedId);
    } catch (error) {
      console.warn('Unable to verify Nessie customer, creating a new one instead.', error);
      existingCustomer = null;
    }
  }

  let customerId = existingCustomer?._id ?? storedId ?? null;

  if (!customerId) {
    const created = await createCustomerProfile(user);
    customerId = created._id;
  }

  let updatedUser = user;
  if (persist) {
    try {
      const persistedUser = await persistNessieCustomerId({
        userId: user.id,
        customerId,
        metadata: user.user_metadata ?? {}
      });
      if (persistedUser) {
        updatedUser = persistedUser;
      }
    } catch (error) {
      console.error('Failed to persist Nessie customer id to Supabase', error);
    }
  }

  return { customerId, user: updatedUser };
}

export async function fetchNessieOverview(customerId) {
  if (!customerId) {
    return { accounts: [], transactions: [] };
  }

  const [accounts = [], transactions = []] = await Promise.all([
    fetchCustomerAccounts(customerId),
    fetchCustomerTransactions(customerId)
  ]);

  return {
    accounts: Array.isArray(accounts) ? accounts : [],
    transactions: Array.isArray(transactions) ? transactions : []
  };
}

export async function fetchCustomerAccounts(customerId) {
  if (!customerId) return [];
  const data = await request(`/customers/${customerId}/accounts`);
  return Array.isArray(data) ? data : [];
}

export async function fetchCustomerTransactions(customerId) {
  if (!customerId) return [];
  const data = await request(`/customers/${customerId}/transactions`);
  return Array.isArray(data) ? data : [];
}

export async function loadAccountsFromSupabase(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('accounts')
    .select('id, nessie_account_id, balance, currency_code, account_number_masked, name, type, user_id')
    .eq('user_id', userId)
    .order('nessie_account_id', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function loadTransactionsFromSupabase(userId, { limit } = {}) {
  if (!userId) return [];

  let query = supabase
    .from('transactions')
    .select('id, nessie_tx_id, amount, category, merchant, timestamp, user_id')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (typeof limit === 'number') {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function syncAccountsFromNessie({ userId, customerId }) {
  if (!userId || !customerId) return [];

  const remoteAccounts = await fetchCustomerAccounts(customerId);
  const rows = remoteAccounts.map((account) => ({
    user_id: userId,
    nessie_account_id: account._id ?? account.id ?? null,
    balance: Number(account.balance ?? account.balanceUSD ?? 0),
    currency_code: account.currency ?? account.currency_code ?? 'USD',
    account_number_masked: account.account_number_masked ?? account.account_number ?? null,
    name: account.nickname ?? account.name ?? account.type ?? 'Account',
    type: account.type ?? null
  }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from('accounts')
      .upsert(rows, { onConflict: 'nessie_account_id' });
    if (error) {
      throw error;
    }

    const remoteIds = rows
      .map((row) => row.nessie_account_id)
      .filter((id) => typeof id === 'string' && id.length > 0);

    if (remoteIds.length > 0) {
      const { error: cleanupError } = await supabase
        .from('accounts')
        .delete()
        .eq('user_id', userId)
        .not('nessie_account_id', 'in', `(${remoteIds.map((id) => `'${id}'`).join(',')})`);
      if (cleanupError && cleanupError.code !== 'PGRST116') {
        console.warn('Failed to prune stale Nessie accounts', cleanupError);
      }
    }
  } else {
    await supabase.from('accounts').delete().eq('user_id', userId);
  }

  return loadAccountsFromSupabase(userId);
}

export async function syncTransactionsFromNessie({ userId, customerId }) {
  if (!userId || !customerId) return [];

  const remoteTransactions = await fetchCustomerTransactions(customerId);
  const rows = remoteTransactions.map((transaction) => ({
    user_id: userId,
    nessie_tx_id: transaction._id ?? transaction.id ?? null,
    amount: Number(transaction.amount ?? transaction.purchase_amount ?? 0),
    category: Array.isArray(transaction.category)
      ? transaction.category[0]
      : transaction.category ?? transaction.type ?? 'General',
    merchant:
      transaction.merchant ??
      transaction.payee ??
      transaction.purchase_description ??
      transaction.description ??
      'Merchant',
    timestamp: normaliseTimestamp(
      transaction.transaction_date ?? transaction.date ?? transaction.purchase_date ?? transaction.post_date
    )
  }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from('transactions')
      .upsert(rows, { onConflict: 'nessie_tx_id' });
    if (error) {
      throw error;
    }
  } else {
    await supabase.from('transactions').delete().eq('user_id', userId);
  }

  return loadTransactionsFromSupabase(userId);
}

function normaliseTimestamp(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

export function mapAccountRow(row) {
  if (!row) return null;
  return {
    id: row.id ?? row.nessie_account_id ?? null,
    nessieAccountId: row.nessie_account_id ?? null,
    balance: Number(row.balance ?? 0),
    currencyCode: row.currency_code ?? 'USD',
    mask: row.account_number_masked ?? '••••',
    name: row.name ?? 'Account',
    type: row.type ?? 'checking',
    userId: row.user_id ?? null
  };
}

export function mapTransactionRow(row) {
  if (!row) return null;
  return {
    id: row.id ?? row.nessie_tx_id ?? null,
    nessieTxId: row.nessie_tx_id ?? null,
    amount: Number(row.amount ?? 0),
    category: row.category ?? 'General',
    merchant: row.merchant ?? 'Merchant',
    timestamp: normaliseTimestamp(row.timestamp),
    userId: row.user_id ?? null
  };
}
