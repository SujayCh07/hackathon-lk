export const DEMO_NESSIE_CUSTOMER_ID = 'demo-customer';

const demoAccounts = [
  {
    _id: 'demo-account',
    nickname: 'Demo Account',
    balanceUSD: 4250.75,
    currency: 'USD',
    type: 'checking',
    account_number_masked: '0000',
  },
] as const;

const demoTransactions = [
  {
    _id: 'txn-001',
    transaction_date: '2024-05-12',
    payee: 'Publix',
    category: ['Groceries'],
    amount: -74.23,
  },
  {
    _id: 'txn-002',
    transaction_date: '2024-05-10',
    payee: 'MARTA',
    category: ['Transport'],
    amount: -32,
  },
  {
    _id: 'txn-003',
    transaction_date: '2024-05-01',
    payee: 'Midtown Loft',
    category: ['Rent'],
    amount: -1450,
  },
  {
    _id: 'txn-004',
    transaction_date: '2024-04-28',
    payee: 'Blue Bottle Coffee',
    category: ['Dining'],
    amount: -8.75,
  },
  {
    _id: 'txn-005',
    transaction_date: '2024-04-25',
    payee: 'Delta Airlines',
    category: ['Travel'],
    amount: -320.5,
  },
] as const;

export function getFallbackNessieOverview() {
  return {
    customerId: DEMO_NESSIE_CUSTOMER_ID,
    accounts: demoAccounts.map((account) => ({ ...account })),
    transactions: demoTransactions.map((transaction) => ({ ...transaction })),
  };
}
