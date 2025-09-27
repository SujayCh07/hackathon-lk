#!/usr/bin/env node

/**
 * Seed helper for the Capital One Nessie sandbox.
 *
 * Usage:
 *   NESSIE_API_KEY=yourKey node scripts/seedNessieDemo.js
 */

const BASE_URL = process.env.NESSIE_BASE_URL ?? 'https://api.nessieisreal.com';
const API_KEY = process.env.NESSIE_API_KEY;

if (!API_KEY) {
  console.error('❌ Missing NESSIE_API_KEY environment variable.');
  process.exit(1);
}

function buildUrl(path) {
  if (!path.startsWith('/')) {
    throw new Error('Nessie paths must start with a leading slash.');
  }

  const url = new URL(path, BASE_URL);
  url.searchParams.set('key', API_KEY);
  return url.toString();
}

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(buildUrl(path), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  let payload = null;
  if (text && text.trim().length > 0) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      throw new Error(`Failed to parse Nessie response: ${text}`);
    }
  }

  if (!response.ok) {
    throw new Error(`Nessie error ${response.status}: ${text}`);
  }

  return payload;
}

async function createCustomer() {
  return request('/customers', {
    method: 'POST',
    body: {
      first_name: 'Demo',
      last_name: 'Explorer',
      address: {
        street_number: '1',
        street_name: 'Capital One Way',
        city: 'McLean',
        state: 'VA',
        zip: '22102'
      }
    }
  });
}

async function createAccount(customerId, overrides = {}) {
  return request(`/customers/${customerId}/accounts`, {
    method: 'POST',
    body: {
      type: 'Checking',
      nickname: 'Travel Checking',
      rewards: 0,
      balance: 4200,
      account_number: '0011223344',
      ...overrides
    }
  });
}

async function createTransaction(accountId, overrides = {}) {
  return request(`/accounts/${accountId}/transactions`, {
    method: 'POST',
    body: {
      amount: 185.75,
      description: 'Lisbon tapas crawl',
      merchant: 'Time Out Market',
      category: 'Dining',
      transaction_date: new Date().toISOString().slice(0, 10),
      ...overrides
    }
  });
}

async function main() {
  try {
    console.log('Creating demo customer...');
    const customer = await createCustomer();
    console.log('✅ Customer created:', customer._id);

    console.log('Creating demo accounts...');
    const accounts = await Promise.all([
      createAccount(customer._id, {
        nickname: 'Travel Checking',
        balance: 4820.45,
        account_number: '77770001'
      }),
      createAccount(customer._id, {
        type: 'Savings',
        nickname: 'Emergency Fund',
        balance: 10250.12,
        account_number: '77770002'
      })
    ]);

    accounts.forEach((account) => {
      console.log(`✅ Account ${account._id} created (${account.nickname})`);
    });

    console.log('Creating demo transactions...');
    const [checking] = accounts;
    const transactions = await Promise.all([
      createTransaction(checking._id, {
        amount: 1275.6,
        description: 'Flight to Lisbon',
        merchant: 'TAP Air Portugal',
        category: 'Travel',
        transaction_date: '2024-05-01'
      }),
      createTransaction(checking._id, {
        amount: 58.2,
        description: 'Grocery run',
        merchant: 'Pingo Doce',
        category: 'Groceries',
        transaction_date: '2024-05-05'
      }),
      createTransaction(checking._id, {
        amount: 245.99,
        description: 'Remote work hub membership',
        merchant: 'Second Home Lisboa',
        category: 'Work',
        transaction_date: '2024-05-08'
      })
    ]);

    transactions.forEach((txn) => {
      console.log(`✅ Transaction ${txn._id} recorded for account ${txn.account_id}`);
    });

    console.log('\nDemo seed complete!');
    console.log('Customer ID:', customer._id);
    console.log('Account IDs:', accounts.map((a) => a._id).join(', '));
  } catch (error) {
    console.error('Failed to seed Nessie demo data:', error);
    process.exitCode = 1;
  }
}

main();
