#!/usr/bin/env bash
# Compare the number of lesson .mdx files in each chapter directory under
# src/content/docs against the expected counts in chapter-lesson-count.csv.
set -euo pipefail

DOCS_DIR="/Users/terenci/react-saas-course/src/content/docs"
CSV="/Users/terenci/react-saas-course/documentation/content/overview/chapter-lesson-count.csv"

mismatches=0
checked=0
missing_dirs=0

# Read the CSV, skipping the header line.
while IFS=, read -r chapter_id expected; do
  [ "$chapter_id" = "chapter_id" ] && continue          # skip header
  [ -z "${chapter_id// }" ] && continue                 # skip blank lines
  expected="${expected//[$'\r\n ']/}"                   # strip CR/whitespace

  # Find the chapter directory: "<id> <title>"
  dir=$(find "$DOCS_DIR" -mindepth 1 -maxdepth 1 -type d -name "${chapter_id} *" -print -quit)

  if [ -z "$dir" ]; then
    printf '%s  MISSING DIRECTORY (expected %s lessons)\n' "$chapter_id" "$expected"
    missing_dirs=$((missing_dirs + 1))
    continue
  fi

  actual=$(find "$dir" -mindepth 1 -maxdepth 1 -type f -name '*.mdx' | wc -l | tr -d ' ')
  checked=$((checked + 1))

  if [ "$actual" != "$expected" ]; then
    printf '%s  MISMATCH  expected=%s  actual=%s  (%s)\n' \
      "$chapter_id" "$expected" "$actual" "$(basename "$dir")"
    mismatches=$((mismatches + 1))
  fi
done < "$CSV"

echo "----------------------------------------"
echo "Chapters checked:        $checked"
echo "Mismatches:              $mismatches"
echo "Missing directories:     $missing_dirs"
if [ "$mismatches" -eq 0 ] && [ "$missing_dirs" -eq 0 ]; then
  echo "Result: all present chapters match ✓"
fi
