🌍 Parity – Global GeoBudget & Smart Spend

Parity helps travelers and remote workers understand where their money stretches furthest by combining:

PPP (Purchasing Power Parity) Data

Personalized Budgeting

Simulated Capital One™ Accounts (via Nessie API)

Transactions, Categorization, and Runway Insights

Instead of just comparing exchange rates, Parity personalizes recommendations based on lifestyle, budget goals, and transaction history—making it more than just a budgeting app.

🚀 Features

Authentication & Profiles

Supabase auth with email + password.

Onboarding personalization: user selects budget focus (Rent, Food, Leisure, Balanced).

Profile stores monthly budget, home/current city, and country preferences.

Budget Dashboard

Displays balances and budget coverage.

Savings runway panel: “Your balance covers ~X months of your lifestyle.”

PPP heatmap & top destination cards.

Weekly spending trends & notifications.

Transactions & Accounts

Uses Nessie API for mock Capital One™ accounts and transactions.

Categorizes transactions into Rent, Food, Transport, etc.

Dashboard updates spending metrics automatically.

Personalization

Recommends top 4 cities globally where your PPP-adjusted budget works best.

Context (e.g. “Best rent-to-income ratio” if Rent is focus).

Personal nudges (under/over budget alerts).

🛠️ Tech Stack

Frontend: React + Vite + TailwindCSS + Framer Motion

Auth & DB: Supabase (Postgres)

Mock Banking Data: Capital One Nessie API

Visualization: Recharts, custom World Map (Leaflet/GeoJSON)

Hosting: Vercel

📊 Database Schema
user_profile

Stores personalization + budget preferences.

CREATE TABLE public.user_profile (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  name text,
  current_city_code text REFERENCES public.ppp_city(code),
  home_city_code text REFERENCES public.ppp_city(code),
  monthly_budget numeric,
  home_country_code text REFERENCES public.country_ref(code),
  current_country_code text REFERENCES public.country_ref(code),
  street_address text
);

user_integrations

Maps Supabase users to Nessie customers.

CREATE TABLE public.user_integrations (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  nessie_customer_id text,
  last_sync timestamptz
);

accounts / transactions

Pulled from Nessie and cached locally.

🔑 Environment Variables

Create a .env file in the root:

VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-key
VITE_NESSIE_BASE_URL=https://api.nessieisreal.com
VITE_NESSIE_API_KEY=your-nessie-key

⚡ Getting Started

Clone repo

git clone https://github.com/your-org/parity.git
cd parity


Install dependencies

npm install
# or
pnpm install


Run locally

npm run dev


Deploy to Vercel

vercel

🧑‍💻 API Calls Used

POST /customers → Create Nessie customer

GET /customers/{id}/accounts → Fetch accounts

GET /customers/{id}/transactions → Fetch transactions

POST /accounts + POST /transactions → Simulated data (if needed)

🎯 Future Improvements

Richer transaction categorization (merchant → category → insights).

AI nudges for smarter budgeting (not just numbers).

Social layer: compare PPP-adjusted budgets with friends.

Integrate real banking APIs (Plaid, Teller) instead of demo Nessie.

🙌 Credits

Built at HackGT by Sujay Chava, Akshaj Nadimpalli, Aditya Jha
Special thanks to Capital One for the Nessie API and PPP datasets powering this project.
