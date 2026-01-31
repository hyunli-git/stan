#!/bin/bash
set -e

echo "=== Creating .env from environment variables ==="
cat > .env << EOF
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
API_BASE_URL=${API_BASE_URL:-https://your-backend.railway.app}
EOF

echo "=== Installing Flutter ==="
git clone https://github.com/flutter/flutter.git --depth 1 -b stable flutter_sdk
export PATH="$PATH:$PWD/flutter_sdk/bin"

echo "=== Flutter Version ==="
flutter --version

echo "=== Enabling Web Support ==="
flutter config --enable-web

echo "=== Getting Dependencies ==="
flutter pub get

echo "=== Building for Web ==="
flutter build web --release --web-renderer html

echo "=== Build Complete ==="
ls -la build/web/
