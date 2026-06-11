#!/usr/bin/env bash
# Crea los 9 planes de suscripción de Kumo en MercadoPago, en ARS.
# Sin free_trial en MP — trials los maneja Kumo (tabla subscriptions).
#
# Mensual: renovación automática hasta cancelar.
# Anual (sin renovación): repetitions=1 → un solo cobro por 12 meses.
# Anual (con renovación): sin repetitions → se renueva cada año hasta cancelar.
#
# Uso:
#   export MP_ACCESS_TOKEN="APP_USR-tu-access-token"
#   bash scripts/create-mp-plans.sh

set -e

if [ -z "$MP_ACCESS_TOKEN" ]; then
  echo "Falta MP_ACCESS_TOKEN. Exportalo primero:"
  echo "  export MP_ACCESS_TOKEN=\"APP_USR-...\""
  exit 1
fi

create_plan() {
  local reason="$1"
  local amount="$2"
  local freq="$3"
  local freq_type="$4"
  local outfile="$5"
  local repetitions="${6:-}"

  local reps_json=""
  if [ -n "$repetitions" ]; then
    reps_json=", \"repetitions\": $repetitions"
  fi

  echo "Creando plan: $reason (ARS $amount)..."
  curl -s -X POST "https://api.mercadopago.com/preapproval_plan" \
    -H "Authorization: Bearer $MP_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"reason\": \"$reason\",
      \"auto_recurring\": {
        \"frequency\": $freq,
        \"frequency_type\": \"$freq_type\",
        \"transaction_amount\": $amount,
        \"currency_id\": \"ARS\"$reps_json
      },
      \"back_url\": \"https://kumo-app.com/settings?subscribed=1\"
    }" | tee "$outfile"
  echo ""
}

create_plan "Kumo · Escaneo OCR · Mensual" 3500 1 months /tmp/mp_ocr_monthly.json
create_plan "Kumo · Escaneo OCR · Anual (sin renovación)" 35000 12 months /tmp/mp_ocr_yearly.json 1
create_plan "Kumo · Escaneo OCR · Anual (renovación automática)" 35000 12 months /tmp/mp_ocr_yearly_auto.json
create_plan "Kumo · WhatsApp automático · Mensual" 3000 1 months /tmp/mp_wa_monthly.json
create_plan "Kumo · WhatsApp automático · Anual (sin renovación)" 30000 12 months /tmp/mp_wa_yearly.json 1
create_plan "Kumo · WhatsApp automático · Anual (renovación automática)" 30000 12 months /tmp/mp_wa_yearly_auto.json
create_plan "Kumo Pro · Combo · Mensual" 5990 1 months /tmp/mp_bundle_monthly.json
create_plan "Kumo Pro · Combo · Anual (sin renovación)" 59900 12 months /tmp/mp_bundle_yearly.json 1
create_plan "Kumo Pro · Combo · Anual (renovación automática)" 59900 12 months /tmp/mp_bundle_yearly_auto.json

extract_id() { grep -o '"id":"[^"]*"' "$1" | head -1 | cut -d'"' -f4; }

echo "========================================"
echo "Listo. Pegá esto en tu .env.local y en Vercel:"
echo ""
echo "MP_PLAN_OCR_MONTHLY=$(extract_id /tmp/mp_ocr_monthly.json)"
echo "MP_PLAN_OCR_YEARLY=$(extract_id /tmp/mp_ocr_yearly.json)"
echo "MP_PLAN_OCR_YEARLY_AUTO=$(extract_id /tmp/mp_ocr_yearly_auto.json)"
echo "MP_PLAN_WA_MONTHLY=$(extract_id /tmp/mp_wa_monthly.json)"
echo "MP_PLAN_WA_YEARLY=$(extract_id /tmp/mp_wa_yearly.json)"
echo "MP_PLAN_WA_YEARLY_AUTO=$(extract_id /tmp/mp_wa_yearly_auto.json)"
echo "MP_PLAN_BUNDLE_MONTHLY=$(extract_id /tmp/mp_bundle_monthly.json)"
echo "MP_PLAN_BUNDLE_YEARLY=$(extract_id /tmp/mp_bundle_yearly.json)"
echo "MP_PLAN_BUNDLE_YEARLY_AUTO=$(extract_id /tmp/mp_bundle_yearly_auto.json)"
echo ""
echo "# Retrocompat (opcional, apuntan al combo):"
echo "MP_PLAN_MONTHLY=$(extract_id /tmp/mp_bundle_monthly.json)"
echo "MP_PLAN_YEARLY=$(extract_id /tmp/mp_bundle_yearly.json)"
echo ""
echo "NEXT_PUBLIC_PRICE_OCR_MONTHLY=ARS 3.500"
echo "NEXT_PUBLIC_PRICE_OCR_YEARLY=ARS 35.000"
echo "NEXT_PUBLIC_PRICE_WA_MONTHLY=ARS 3.000"
echo "NEXT_PUBLIC_PRICE_WA_YEARLY=ARS 30.000"
echo "NEXT_PUBLIC_PRICE_BUNDLE_MONTHLY=ARS 5.990"
echo "NEXT_PUBLIC_PRICE_BUNDLE_YEARLY=ARS 59.900"
echo ""
echo "Anual sin renovación = repetitions: 1."
echo "Anual con renovación = sin límite de repetitions."
echo "Mensual = renovación automática hasta cancelar."
echo "========================================"
