#!/usr/bin/env bash

set -euf -o pipefail

if test $# -ge 1 && test "$1" == '--help'; then
	echo "Usage: $0 [branch]"
	echo "Parse the human-readable README file from the"
	echo "	https://github.com/marmelo/tech-companies-in-portugal"
	echo "into local YAML and JSON files."
	echo
	echo "Note! Please be sure to properly format and lint the files with"
	echo "tools afterwards, e.g. prettier, yamllint, yq, jq, etc."
	echo
	echo "You can convert YAML to JSON:"
	echo "	yq . \$yaml_file > \$json_file"
	exit 0
fi

SRC_URL="https://raw.githubusercontent.com/marmelo/tech-companies-in-portugal/${1:-master}/README.md"

INPUT_FILE=$(mktemp)
curl -Ss "$SRC_URL" >"$INPUT_FILE"

YAML_FILE='bios.yaml'
JSON_FILE='bios.json'

TMPFILE=$(mktemp)

# Trust the pattern /^| [/ to match lines with one company.
grep -Ee '^\| \[' "$INPUT_FILE" >"$TMPFILE"

declare -a KEY NAME WEBSITE BIO
mapfile -t KEY < <(
	cut -d '|' -f2 "$TMPFILE" |
	sed -n -r -e 's/^\s*\[([^]]+)\].*$/\1/p' |
	tr '[:upper:]' '[:lower:]' |
	tr -s ' ' '_'
)
mapfile -t NAME < <(
	cut -d '|' -f2 "$TMPFILE" |
	sed -n -r -e 's/^\s*\[([^]]+)\].*$/\1/p'
)
mapfile -t WEBSITE < <(
	cut -d '|' -f2 "$TMPFILE" |
	sed -n -r -e 's/^[^(]+\((http[^)]+)\).*$/\1/p' |
	sed -r -e 's/\/\s*$//'
)
mapfile -t BIO < <(
	cut -d '|' -f3 "$TMPFILE" |
	sed -r -e 's/\s*\.\s*$|\(.*$//' |
	sed -r -e 's/^\s+//'
)

rm -f "$TMPFILE" "$INPUT_FILE"

printf '%s\ncompanies:\n' '---' >"$YAML_FILE"

for i in "${!NAME[@]}"; do
	printf \
"  %s:
    name: %s
    contacts:
      website: %s
    bio: %s
" "${KEY[$i]}" "${NAME[$i]}" "${WEBSITE[$i]}" "${BIO[$i]}"
done >>"$YAML_FILE"

echo "yaml file written to $YAML_FILE"

if ! command -v yq >/dev/null; then
	echo "yq not installed, not converting to json"
elif yq . "$YAML_FILE" >"$JSON_FILE"; then
	echo "Converted yaml file to json: $JSON_FILE"
else
	echo "Failed to convert yaml to json"
	echo "Please clean up the yaml file first."
	echo "See $0 --help"
fi
