# Nessie sandbox quickstart

Use these snippets to seed and inspect demo data for local development and hackathon demos.

## 1. Seed a customer with accounts + transactions

1. Export your Nessie API key so the script can authenticate.

   ```bash
   export NESSIE_API_KEY=your_sandbox_key
   ```

2. Run the helper script to create a customer, two accounts, and a few recent transactions.

   ```bash
   node scripts/seedNessieDemo.js
   ```

   The script logs the created `customerId` and account ids so you can copy them into Supabase if needed.

## 2. Verify the data via curl

Replace `<customerId>` / `<accountId>` with the ids printed in the previous step.

```bash
# Fetch the customer profile
curl "https://api.nessieisreal.com/customers/<customerId>?key=$NESSIE_API_KEY" | jq

# List accounts for the customer
curl "https://api.nessieisreal.com/customers/<customerId>/accounts?key=$NESSIE_API_KEY" | jq

# List transactions for an account
curl "https://api.nessieisreal.com/accounts/<accountId>/transactions?key=$NESSIE_API_KEY" | jq
```

## 3. Quick fetch helper (inside your React app or Node tools)

```js
import { ensureNessieCustomer, syncAccountsFromNessie } from '../src/lib/nessie.js';

async function refreshForUser(user) {
  const { customerId } = await ensureNessieCustomer(user);
  const accounts = await syncAccountsFromNessie({ userId: user.id, customerId });
  console.log('Synced accounts:', accounts);
}
```

This snippet mirrors the production logic: it ensures a customer exists, syncs the latest balances from Nessie, and persists them into Supabase for offline caching.
