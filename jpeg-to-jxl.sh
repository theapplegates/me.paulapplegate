#!/usr/bin/env bash
# jpeg-to-jxl.sh
# Convert only the JPEG files in a folder to JPEG XL (.jxl).
# PDFs, MP4s and every other file type are ignored.
#
# Default mode is a lossless JPEG transcode (pixel-identical, and the original
# JPEG can be reconstructed bit-for-bit from the .jxl). Pass -d for lossy.
#
# Requires cjxl:  macOS:  brew install jpeg-xl
#                 Debian/Ubuntu:  sudo apt install libjxl-tools

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: jpeg-to-jxl.sh [options] [input_dir]

  input_dir    Folder to scan (default: current directory)

Options:
  -o DIR       Output folder (default: <input_dir>/output_jxl)
  -d DIST      Lossy re-encode at this Butteraugli distance (e.g. 1.0).
			   Omit for a lossless JPEG transcode (recommended).
  -e EFFORT    Encoder effort 1-9 (default: 7)
  -r           Recurse into subfolders (keeps the folder structure)
  -f           Overwrite existing .jxl files (default: skip them)
  -h           Show this help
EOF
}

OUTPUT_DIR=""
DISTANCE=""
EFFORT=7
RECURSIVE=0
FORCE=0

while getopts "o:d:e:rfh" opt; do
  case "$opt" in
	o) OUTPUT_DIR="$OPTARG" ;;
	d) DISTANCE="$OPTARG" ;;
	e) EFFORT="$OPTARG" ;;
	r) RECURSIVE=1 ;;
	f) FORCE=1 ;;
	h) usage; exit 0 ;;
	*) usage; exit 1 ;;
  esac
done
shift $((OPTIND - 1))

INPUT_DIR="${1:-.}"

if ! command -v cjxl >/dev/null 2>&1; then
  echo "Error: cjxl not found. Install it with 'brew install jpeg-xl' (macOS) or 'sudo apt install libjxl-tools' (Debian/Ubuntu)." >&2
  exit 1
fi

if [ ! -d "$INPUT_DIR" ]; then
  echo "Error: input folder not found: $INPUT_DIR" >&2
  exit 1
fi

INPUT_DIR="$(cd "$INPUT_DIR" && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-$INPUT_DIR/output_jxl}"
mkdir -p "$OUTPUT_DIR"
OUTPUT_DIR="$(cd "$OUTPUT_DIR" && pwd)"

# Only .jpg / .jpeg (any case). Nothing else is matched.
FIND_ARGS=("$INPUT_DIR")
if [ "$RECURSIVE" -eq 0 ]; then
  FIND_ARGS+=(-maxdepth 1)
fi
FIND_ARGS+=(-type f \( -iname '*.jpg' -o -iname '*.jpeg' \) -not -path "$OUTPUT_DIR/*" -print0)

converted=0
skipped=0
failed=0
bytes_in=0
bytes_out=0

echo "Input:  $INPUT_DIR"
echo "Output: $OUTPUT_DIR"
if [ -n "$DISTANCE" ]; then
  echo "Mode:   lossy (distance $DISTANCE, effort $EFFORT)"
else
  echo "Mode:   lossless JPEG transcode (effort $EFFORT)"
fi
echo

while IFS= read -r -d '' src; do
  rel="${src#"$INPUT_DIR"/}"
  dst="$OUTPUT_DIR/${rel%.*}.jxl"

  if [ -e "$dst" ] && [ "$FORCE" -eq 0 ]; then
	echo "skip     $rel (already exists)"
	skipped=$((skipped + 1))
	continue
  fi

  mkdir -p "$(dirname "$dst")"

  if [ -n "$DISTANCE" ]; then
	cmd=(cjxl "$src" "$dst" -d "$DISTANCE" -e "$EFFORT" --lossless_jpeg=0 --quiet)
  else
	cmd=(cjxl "$src" "$dst" -e "$EFFORT" --quiet)
  fi

  if "${cmd[@]}"; then
	in_size=$(wc -c < "$src" | tr -d ' ')
	out_size=$(wc -c < "$dst" | tr -d ' ')
	bytes_in=$((bytes_in + in_size))
	bytes_out=$((bytes_out + out_size))
	converted=$((converted + 1))
	echo "ok       $rel  ($in_size -> $out_size bytes)"
  else
	rm -f "$dst"
	failed=$((failed + 1))
	echo "FAILED   $rel" >&2
  fi
done < <(find "${FIND_ARGS[@]}")

echo
echo "Converted: $converted   Skipped: $skipped   Failed: $failed"
if [ "$bytes_in" -gt 0 ]; then
  saved=$(( (bytes_in - bytes_out) * 100 / bytes_in ))
  echo "Total size: $bytes_in -> $bytes_out bytes (${saved}% smaller)"
fi

[ "$failed" -eq 0 ]
