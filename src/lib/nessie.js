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

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Nessie API error (${response.status}): ${message}`);
  }

  return response.json();
}

export async function ensureNessieCustomer(user) {
  const existingId = user?.user_metadata?.nessieCustomerId;
  if (existingId) {
    return { customerId: existingId };
  }

  const profile = {
    first_name: user?.user_metadata?.first_name ?? user?.email?.split('@')[0] ?? 'PPP',
    last_name: user?.user_metadata?.last_name ?? 'Explorer',
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

  const { data, error } = await supabase.auth.updateUser({
    data: {
      ...(user?.user_metadata ?? {}),
      nessieCustomerId: customer._id
    }
  });

  if (error) {
    throw error;
  }

  return {
    customerId: customer._id,
    user: data?.user ?? user
  };
}

export async function fetchNessieOverview(customerId) {
  if (!customerId) {
    return { accounts: [], transactions: [] };
  }

  const [accounts = [], transactions = []] = await Promise.all([
    request(`/customers/${customerId}/accounts`),
    request(`/customers/${customerId}/transactions`)
  ]);

  return {
    accounts: Array.isArray(accounts) ? accounts : [],
    transactions: Array.isArray(transactions) ? transactions : []
  };
}
