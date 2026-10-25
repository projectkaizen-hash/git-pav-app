#!/bin/bash
set -e

OUT_DIR="${OUT_DIR:-$(pwd)/screenshots}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PORT="${PORT:-8098}"

mkdir -p "$OUT_DIR"

export PORT=8098
node "$(pwd)/pavdental/scripts/spa-server.mjs" &
SERVER_PID=$!

trap "kill -9 $SERVER_PID 2>/dev/null || true" EXIT

sleep 2

capture() {
  NAME=$1
  PATH_URL=$2
  OUT="$OUT_DIR/${NAME}.png"
  echo "Capturing $NAME ($PATH_URL)..."
  "$CHROME" --headless --disable-gpu --virtual-time-budget=2500 --window-size=393,852 --screenshot="$OUT" "http://localhost:$PORT$PATH_URL"
  echo "Saved $OUT"
}

capture "01_welcome" "/"
capture "02_sign_in" "/(auth)/sign-in"
capture "03_sign_up" "/(auth)/sign-up"
capture "04_otp" "/(auth)/otp"
capture "05_patient_home" "/(patient)/(tabs)/home?demo=patient"
capture "06_patient_records" "/(patient)/(tabs)/records?demo=patient"
capture "07_patient_profile" "/(patient)/(tabs)/profile?demo=patient"
capture "08_patient_appointments" "/(patient)/(tabs)/appointments?demo=patient"
capture "09_booking_catalog" "/(patient)/booking/service-catalog?demo=patient"
capture "10_onboarding_profile" "/onboarding/profile?demo=patient"
capture "11_onboarding_insurance" "/onboarding/insurance?demo=patient"
capture "12_onboarding_medical" "/onboarding/medical-history?demo=patient"
capture "13_onboarding_consents" "/onboarding/consents?demo=patient"
capture "14_onboarding_complete" "/onboarding/complete?demo=patient"
capture "15_auth_forgot" "/(auth)/forgot"
capture "16_rewards_perks" "/(patient)/perks?demo=patient"

echo "All screenshots captured successfully!"
