#!/usr/bin/env bash
# Crea los 2 planes de suscripción de Kumo Pro en MercadoPago, en ARS.
# Sin free_trial en MP — el trial de 7 días lo maneja Kumo (tabla subscriptions).
# Uso:
#   export MP_ACCESS_TOKEN="APP_USR-tu-access-token"
#   bash scripts/create-mp-plans.sh

set -e

if [ -z "$MP_ACCESS_TOKEN" ]; then
  echo "Falta MP_ACCESS_TOKEN. Exportalo primero:"
  echo "  export MP_ACCESS_TOKEN=\"APP_USR-...\""
  exit 1
fi

echo "Creando plan MENSUAL (ARS 3.500 / mes)..."
curl -s -X POST "https://api.mercadopago.com/preapproval_plan" \
  -H "Authorization: Bearer $MP_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Kumo Pro · Mensual",
    "auto_recurring": {
      "frequency": 1,
      "frequency_type": "months",
      "transaction_amount": 3500,
      "currency_id": "ARS"
    },
    "back_url": "https://kumo-app.com/settings?subscribed=1"
  }' | tee /tmp/mp_monthly.json
echo ""
echo ""

echo "Creando plan ANUAL (ARS 35.000 / año)..."
curl -s -X POST "https://api.mercadopago.com/preapproval_plan" \
  -H "Authorization: Bearer $MP_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Kumo Pro · Anual",
    "auto_recurring": {
      "frequency": 12,
      "frequency_type": "months",
      "transaction_amount": 35000,
      "currency_id": "ARS"
    },
    "back_url": "https://kumo-app.com/settings?subscribed=1"
  }' | tee /tmp/mp_yearly.json
echo ""
echo ""

MONTHLY_ID=$(grep -o '"id":"[^"]*"' /tmp/mp_monthly.json | head -1 | cut -d'"' -f4)
YEARLY_ID=$(grep -o '"id":"[^"]*"' /tmp/mp_yearly.json | head -1 | cut -d'"' -f4)

echo "========================================"
echo "Listo. Pegá esto en tu .env.local y en Vercel:"
echo ""
echo "MP_PLAN_MONTHLY=$MONTHLY_ID"
echo "MP_PLAN_YEARLY=$YEARLY_ID"
echo ""
echo "(el trial de 7 días lo maneja Kumo, no MP)"
echo "========================================"
