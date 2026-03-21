#!/bin/bash
# Usage: diagnose.sh <image_path> [message]
IMAGE="$1"
MESSAGE="${2:-Diagnostica esta planta}"

if [ -z "$IMAGE" ] || [ ! -f "$IMAGE" ]; then
  echo "Error: provide a valid image path"
  exit 1
fi

RESULT=$(curl -s -X POST http://localhost:8080/api/chat \
  -H "X-Demo-Token: aleph-hackathon-2026" \
  -F "message=$MESSAGE" \
  -F "image=@$IMAGE")

echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('reply','Error: no reply'))" 2>/dev/null || echo "$RESULT"
