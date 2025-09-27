const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function callFn(name, { userId, body } = {}) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(userId ? { "x-user-id": userId } : {}) },
    body: JSON.stringify(body ?? {})
  });
  if (!res.ok) throw new Error(`${name} ${res.status}`);
  return res.json();
}

export const getDashboard = ({ userId }) => callFn("dashboard", { userId });
export const getPlanner   = ({ userId, monthlyBudget }) => callFn("planner", { userId, body: { monthlyBudget } });
export const getInsights  = ({ userId }) => callFn("insights", { userId });
