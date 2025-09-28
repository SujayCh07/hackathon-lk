#!/usr/bin/env bash
# nessie_flow.sh (macOS-safe)
set -Eeo pipefail

# ── CONFIG ────────────────────────────────────────────────────────────────────
: "${NESSIE_BASE:=http://api.nessieisreal.com}"   # HTTP works reliably for Nessie
: "${NESSIE_KEY:=300d851e1a417899f2e58238ad42ecf6}"

: "${SUPABASE_URL:=https://ukjadbtyhovuebzqrwbf.supabase.co}"
: "${SYNC_URL:=$SUPABASE_URL/functions/v1/nessie-sync}"
: "${TEST_USER_ID:=cab47ad0-d209-4935-8d79-dc1d6b3f9d36}"

TMP_DIR="$(mktemp -d -t nessie_flow_XXXXXX)"
trap 'rm -rf "$TMP_DIR"' EXIT

need() { command -v "$1" >/dev/null 2>&1 || { echo "Please install $1"; exit 1; }; }
need jq
to_lower(){ printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }
hr(){ printf '%*s\n' 80 '' | tr ' ' '─'; }
today(){ date -u +%Y-%m-%d; }

# ── HTTP helpers ──────────────────────────────────────────────────────────────
nessie_post() {
  local path="$1" json="$2" outfile="$3"
  : > "$outfile"
  if ! curl -sS --fail-with-body "$NESSIE_BASE$path?key=$NESSIE_KEY" \
        -H "Content-Type: application/json" \
        -d "$json" -o "$outfile"; then
    echo "ERROR: POST $NESSIE_BASE$path failed" >&2
    [[ -s "$outfile" ]] && { echo "Body:" >&2; cat "$outfile" >&2; }
    exit 1
  fi
}

ask_count() {
  local prompt="$1" ans
  read -r -p "$prompt (number or 'none'): " ans
  ans="$(to_lower "${ans:-}")"
  if [[ -z "$ans" || "$ans" == "none" ]]; then echo 0; else echo "$ans"; fi
}

# ── In-memory IDs from this run ───────────────────────────────────────────────
ACCOUNT_IDS=()
MERCHANT_IDS=()

# print menus to STDERR; echo only the selection to STDOUT
choose_account() {
  if (( ${#ACCOUNT_IDS[@]} == 0 )); then
    echo ""
    return
  fi
  if (( ${#ACCOUNT_IDS[@]} == 1 )); then
    echo "${ACCOUNT_IDS[0]}"
    return
  fi
  >&2 echo "Available accounts:"
  local i
  for i in "${!ACCOUNT_IDS[@]}"; do
    >&2 echo "  [$i] ${ACCOUNT_IDS[$i]}"
  done
  local sel
  read -r -p "Pick account index [0]: " sel </dev/tty || sel=0
  [[ "$sel" =~ ^[0-9]+$ ]] || sel=0
  (( sel >= 0 && sel < ${#ACCOUNT_IDS[@]} )) || sel=0
  echo "${ACCOUNT_IDS[$sel]}"
}

choose_merchant() {
  if (( ${#MERCHANT_IDS[@]} == 0 )); then
    echo ""
    return
  fi
  if (( ${#MERCHANT_IDS[@]} == 1 )); then
    echo "${MERCHANT_IDS[0]}"
    return
  fi
  >&2 echo "Available merchants:"
  local i
  for i in "${!MERCHANT_IDS[@]}"; do
    >&2 echo "  [$i] ${MERCHANT_IDS[$i]}"
  done
  local sel
  read -r -p "Pick merchant index [0]: " sel </dev/tty || sel=0
  [[ "$sel" =~ ^[0-9]+$ ]] || sel=0
  (( sel >= 0 && sel < ${#MERCHANT_IDS[@]} )) || sel=0
  echo "${MERCHANT_IDS[$sel]}"
}

# ── 1) CUSTOMER ───────────────────────────────────────────────────────────────
echo
hr
echo "Create ONE customer (per run)."

read -r -p "First name [Alex]: " FIRST_NAME; FIRST_NAME="${FIRST_NAME:-Alex}"
read -r -p "Last  name [Johnson]: " LAST_NAME;  LAST_NAME="${LAST_NAME:-Johnson}"
read -r -p "Street number [123]: " STREET_NO;   STREET_NO="${STREET_NO:-123}"
read -r -p "Street name   [Main St]: " STREET;  STREET="${STREET:-Main St}"
read -r -p "City          [Atlanta]: " CITY;     CITY="${CITY:-Atlanta}"
read -r -p "State         [GA]: " STATE;         STATE="${STATE:-GA}"
read -r -p "ZIP           [30332]: " ZIP;        ZIP="${ZIP:-30332}"

echo
echo "→ Creating customer at Nessie…"
nessie_post "/customers" "$(cat <<JSON
{
  "first_name": "$FIRST_NAME",
  "last_name": "$LAST_NAME",
  "address": {
    "street_number": "$STREET_NO",
    "street_name": "$STREET",
    "city": "$CITY",
    "state": "$STATE",
    "zip": "$ZIP"
  }
}
JSON
)" "$TMP_DIR/nessie_customer.json"

jq . < "$TMP_DIR/nessie_customer.json"
CUSTOMER_ID="$(jq -r '.objectCreated?._id // ._id // .id // empty' "$TMP_DIR/nessie_customer.json")"
if [[ -z "${CUSTOMER_ID:-}" ]]; then
  echo "FATAL: Could not extract CUSTOMER_ID." >&2
  exit 1
fi
echo "CUSTOMER_ID=$CUSTOMER_ID"

# ── 2) ACCOUNTS ───────────────────────────────────────────────────────────────
echo
hr
ACC_N="$(ask_count "How many accounts to create for this customer")"
for ((i=1; i<=ACC_N; i++)); do
  echo
  echo "Account #$i"
  read -r -p "Type [Checking/Savings] (default Checking): " ACC_TYPE; ACC_TYPE="${ACC_TYPE:-Checking}"
  read -r -p "Nickname [Primary]: " ACC_NICK; ACC_NICK="${ACC_NICK:-Primary}"
  read -r -p "Starting balance [4200]: " ACC_BAL; ACC_BAL="${ACC_BAL:-4200}"

  echo "→ Creating account…"
  nessie_post "/customers/$CUSTOMER_ID/accounts" "$(cat <<JSON
{
  "type": "$ACC_TYPE",
  "nickname": "$ACC_NICK",
  "rewards": 0,
  "balance": $(printf '%.2f' "$ACC_BAL")
}
JSON
)" "$TMP_DIR/nessie_account_$i.json"

  jq . < "$TMP_DIR/nessie_account_$i.json"
  ACC_ID="$(jq -r '.objectCreated?._id // ._id // .id // empty' "$TMP_DIR/nessie_account_$i.json")"
  if [[ -z "${ACC_ID:-}" ]]; then
    echo "FATAL: Could not extract account id." >&2
    exit 1
  fi
  echo "ACCOUNT_ID[$i]=$ACC_ID"
  ACCOUNT_IDS+=("$ACC_ID")
done

# ── 3) MERCHANTS ──────────────────────────────────────────────────────────────
echo
hr
MRC_N="$(ask_count "How many merchants to create")"
for ((i=1; i<=MRC_N; i++)); do
  echo
  echo "Merchant #$i"
  read -r -p "Name [Test Market]: " MRC_NAME;  MRC_NAME="${MRC_NAME:-Test Market}"
  read -r -p "City [Atlanta]: " MRC_CITY;      MRC_CITY="${MRC_CITY:-Atlanta}"
  read -r -p "State [GA]: " MRC_STATE;         MRC_STATE="${MRC_STATE:-GA}"
  read -r -p "Zip [30313]: " MRC_ZIP;          MRC_ZIP="${MRC_ZIP:-30313}"

  echo "→ Creating merchant…"
  nessie_post "/merchants" "$(cat <<JSON
{
  "name": "$MRC_NAME",
  "address": {
    "street_number": "10",
    "street_name": "Tech Pkwy NW",
    "city": "$MRC_CITY",
    "state": "$MRC_STATE",
    "zip": "$MRC_ZIP"
  },
  "geocode": { "lat": 33.7765, "lng": -84.3980 }
}
JSON
)" "$TMP_DIR/nessie_merchant_$i.json"

  jq . < "$TMP_DIR/nessie_merchant_$i.json"
  MRC_ID="$(jq -r '.objectCreated?._id // ._id // .id // empty' "$TMP_DIR/nessie_merchant_$i.json")"
  if [[ -z "${MRC_ID:-}" ]]; then
    echo "FATAL: Could not extract merchant id." >&2
    exit 1
  fi
  echo "MERCHANT_ID[$i]=$MRC_ID"
  MERCHANT_IDS+=("$MRC_ID")
done

# ── 4) TRANSACTIONS ───────────────────────────────────────────────────────────
echo
hr
TX_N="$(ask_count "How many transactions to create")"

for ((i=1; i<=TX_N; i++)); do
  echo
  echo "Transaction #$i"

  if (( ${#ACCOUNT_IDS[@]} == 0 )); then
    echo "No accounts exist; skipping transactions."
    break
  fi

  SEL_ACC="$(choose_account)"
  if [[ -z "$SEL_ACC" ]]; then echo "No account selected; skipping."; break; fi

  if (( ${#MERCHANT_IDS[@]} == 0 )); then
    echo "No merchants exist; creating a default 'Test Market'…"
    nessie_post "/merchants" '{
      "name":"Test Market",
      "address":{"street_number":"10","street_name":"Tech Pkwy NW","city":"Atlanta","state":"GA","zip":"30313"},
      "geocode":{"lat":33.7765,"lng":-84.3980}
    }' "$TMP_DIR/nessie_merchant_autocreated.json"
    jq . < "$TMP_DIR/nessie_merchant_autocreated.json"
    DEF_MID="$(jq -r '.objectCreated?._id // ._id // .id // empty' "$TMP_DIR/nessie_merchant_autocreated.json")"
    [[ -n "$DEF_MID" ]] && MERCHANT_IDS+=("$DEF_MID")
  fi

  SEL_MRC="$(choose_merchant)"
  if [[ -z "$SEL_MRC" ]]; then echo "No merchant selected; skipping."; break; fi

  read -r -p "Description [Groceries - Test Market]: " TX_DESC;  TX_DESC="${TX_DESC:-Groceries - Test Market}"
  read -r -p "Amount (e.g. 89.32) [12.34]: " TX_AMT;            TX_AMT="${TX_AMT:-12.34}"
  read -r -p "Date (YYYY-MM-DD) [$(today)]: " TX_DATE;          TX_DATE="${TX_DATE:-$(today)}"
  read -r -p "Status (completed/pending) [completed]: " TX_STATUS; TX_STATUS="${TX_STATUS:-completed}"

  echo "→ Creating purchase…"
  nessie_post "/accounts/$SEL_ACC/purchases" "$(cat <<JSON
{
  "merchant_id": "$SEL_MRC",
  "medium": "balance",
  "purchase_date": "$TX_DATE",
  "amount": $(printf '%.2f' "$TX_AMT"),
  "status": "$TX_STATUS",
  "description": "$TX_DESC"
}
JSON
)" "$TMP_DIR/nessie_purchase_$i.json"

  jq . < "$TMP_DIR/nessie_purchase_$i.json"
  TX_ID="$(jq -r '.objectCreated?._id // ._id // .id // empty' "$TMP_DIR/nessie_purchase_$i.json")"
  if [[ -z "${TX_ID:-}" ]]; then
    echo "FATAL: Could not extract transaction id." >&2
    exit 1
  fi
  echo "TX_ID[$i]=$TX_ID"
done

# ── 5) SYNC TO SUPABASE ───────────────────────────────────────────────────────
echo
hr
echo "→ Triggering Supabase nessie-sync (copy from Nessie into your DB)…"
curl -sS -X POST "$SYNC_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $TEST_USER_ID" \
  -H "x-debug: 1" \
  -d "{\"customer_id\":\"$CUSTOMER_ID\"}" | jq .

echo
echo "✅ Done. Temp files in: $TMP_DIR (cleaned on shell exit)."
