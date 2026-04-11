#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AVATARS_DIR="$SCRIPT_DIR/../public/avatars"
BLENDER_PY="$SCRIPT_DIR/rotate_and_export_blender.py"
TS=$(date +%s)

if [ ! -f "$BLENDER_PY" ]; then
  echo "Blender python script not found: $BLENDER_PY"
  exit 2
fi

if [ ! -d "$AVATARS_DIR" ]; then
  echo "Avatars dir not found: $AVATARS_DIR"
  exit 3
fi

for name in anny_hombre anny_mujer; do
  OBJ="$AVATARS_DIR/${name}.obj"
  OUT="$AVATARS_DIR/${name}_fixed.glb"
  if [ ! -f "$OBJ" ]; then
    echo "Missing OBJ: $OBJ"
    exit 4
  fi
  echo "Exporting $OBJ -> $OUT"
  blender --background --python "$BLENDER_PY" -- "$OBJ" "$OUT"
done

# backup existing GLBs and replace
[ -f "$AVATARS_DIR/anny_hombre.glb" ] && cp -f "$AVATARS_DIR/anny_hombre.glb" "$AVATARS_DIR/anny_hombre.bak.$TS.glb"
[ -f "$AVATARS_DIR/anny_mujer.glb" ] && cp -f "$AVATARS_DIR/anny_mujer.glb" "$AVATARS_DIR/anny_mujer.bak.$TS.glb"

mv -f "$AVATARS_DIR/anny_hombre_fixed.glb" "$AVATARS_DIR/anny_hombre.glb"
mv -f "$AVATARS_DIR/anny_mujer_fixed.glb" "$AVATARS_DIR/anny_mujer.glb"

# update standard copies
cp -f "$AVATARS_DIR/anny_hombre.glb" "$AVATARS_DIR/standard_male.glb"
cp -f "$AVATARS_DIR/anny_mujer.glb" "$AVATARS_DIR/standard_female.glb"
cp -f "$AVATARS_DIR/anny_mujer.glb" "$AVATARS_DIR/standard_curvy.glb"

ls -lh "$AVATARS_DIR"
