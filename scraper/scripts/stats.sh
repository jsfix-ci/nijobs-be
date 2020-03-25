#!/usr/bin/env bash

set -eufo pipefail
ACTION="$1"

if ! command -v jq >/dev/null; then
    echo "Need 'jq' to get statistics. Please install jq."
    exit 2
fi

val() { awk "BEGIN {print $*}"; }
perc() { awk "BEGIN {print $**100\"%\"}"; }
add_up() { awk '{s+=$1} END {print s+0}' "$@"; }
count_yaml() { find "$1" -name '*.yaml' | wc -l; }

function stats_scrap() {
	local SCRAP="output/scrap"
	local STATS="output/scrap/stats"
	local ALL="output/scrap/all_jobs.json"
	local COMP="output/scrap/all_companies.json"

	test -d "$SCRAP" || return 0
	if ! test -f "$ALL" || ! test -f "$COMP"; then
		echo "$ALL or $COMP is missing; you probably forgot to merge"
		echo "	$ make merge-scrap"
		return 0
	fi

	mkdir -p "$STATS"

	# sorted list of job ids
	jq -r '.[].id' "$ALL" |
		sort -n >"$STATS/ids" &

	# sorted list of company ids
	jq -r '.[].id' "$COMP" |
		sort >"$STATS/companies" &

	# counted list of companies
	jq -r '.[].company' "$ALL" |
		sort | uniq -c | sort -nr >"$STATS/company_count" &

	# counted list of tags
    jq -r '.[].tags[]' "$ALL" |
		sort | uniq -c | sort -nr >"$STATS/tag_count" &

	# counted list of roles
	jq -r '.[].role' "$ALL" | sed -e 's/^\s*$/[[null]]/' |
		sort | uniq -c | sort -nr >"$STATS/role_count" &

	# job titles
	jq -r '.[]|([.id, .title])|join("  ")' "$ALL" |
		sort -nr >"$STATS/titles" &

	# description lengths, sorted
	jq -r '.[].description|length' "$ALL" |
		sort -nr >"$STATS/description_lengths" &

	wait

	printf '' > "$STATS/overall"
	local O C T R D N

	O=$(wc -l <"$STATS/ids")
	C=$(count_yaml "$SCRAP/companies")
	TN=$(wc -l <"$STATS/tag_count")

	printf '%d\t\tjobs\n' "$O" >>"$STATS/overall"
	printf '%d\t\tcompanies\n' "$C" >>"$STATS/overall"
	printf '%d\t\ttags\n' "$TN" >>"$STATS/overall"

	if ((C > 0)); then
		printf '%f\tjobs/company\n' "$(val "$O/$C")"
	fi >>"$STATS/overall"

	if ((O > 0)); then
		T=$(add_up "$STATS/tag_count")
		D=$(add_up "$STATS/description_lengths")
		N=$(awk '/\bundefined\b/ {print $1}' "$STATS/company_count" || true)
		R=$(awk '/\[\[null\]\]/ {print $1}' "$STATS/role_count" || true)
		printf '%f\ttags/job\n' "$(val "$T/$O")"
		printf '%f\tavg description length\n' "$(val "$D/$O")"
		printf '%d\t\tnull companies\n' "${N:-0}"
		printf '%d\t\tnull roles\n' "${R:-0}"
	fi >>"$STATS/overall"
}

function stats_nijobs() {
	local NIJOBS="output/nijobs"
	local STATS="output/nijobs/stats"
	local ALL="output/nijobs/all_offers.json"
	local COMP="output/nijobs/all_companies.json"

	test -d "$NIJOBS" || return 0
	if ! test -f "$ALL" || ! test -f "$COMP"; then
		echo "$ALL or $COMP is missing; you probably forgot to merge"
		echo "	$ make merge-nijobs"
		return 0
	fi

	mkdir -p "$STATS"

	# sorted list of job ids
	jq -r '.[].id' "$ALL" |
		sort -n >"$STATS/ids" &

	# sorted list of company ids
	jq -r '.[].id' "$COMP" |
		sort >"$STATS/companies" &

	# counted list of companies
	jq -r '.[].company' "$ALL" |
		sort | uniq -c | sort -nr >"$STATS/company_count" &

	# counted list of technologies
    jq -r '.[].technologies[]' "$ALL" |
		sort | uniq -c | sort -nr >"$STATS/technology_count" &

	# counted list of fields
	jq -r '.[].fields[]' "$ALL" |
		sort | uniq -c | sort -nr >"$STATS/field_count" &

	# job titles
	jq -r '.[]|([.id, .title])|join("  ")' "$ALL" |
		sort -n >"$STATS/titles" &

	# description lengths, sorted
	jq -r '.[].description|length' "$ALL" |
		sort -nr >"$STATS/description_lengths" &

	wait

	printf '' > "$STATS/overall"
	local O C T F D N

	O=$(wc -l <"$STATS/ids")
	C=$(count_yaml "$NIJOBS/companies")
	TN=$(wc -l <"$STATS/technology_count")
	FN=$(wc -l <"$STATS/field_count")

	printf '%d\t\toffers\n' "$O" >>"$STATS/overall"
	printf '%d\t\tcompanies\n' "$C" >>"$STATS/overall"
	printf '%d\t\ttechnologies\n' "$TN" >>"$STATS/overall"
	printf '%d\t\tfields\n' "$FN" >>"$STATS/overall"

	if ((C > 0)); then
		printf '%f\toffers/company\n' "$(val "$O/$C")"
	fi >>"$STATS/overall"

	if ((O > 0)); then
		T=$(add_up "$STATS/technology_count")
		F=$(add_up "$STATS/field_count")
		D=$(add_up "$STATS/description_lengths")
		N=$(awk '/undefined/ {print $1}' "$STATS/company_count" || true)
		printf '%f\ttechnologies/offer\n' "$(val "$T/$O")"
		printf '%f\tfields/offer\n' "$(val "$F/$O")"
		printf '%f\tavg description length\n' "$(val "$D/$O")"
		printf '%d\t\tnull companies\n' "${N:-0}"
	fi >>"$STATS/overall"
}

case $ACTION in
	scrap) stats_scrap;;
	nijobs) stats_nijobs;;
	all) stats_scrap ; stats_nijobs;;
	*)
		echo "Unknown command '$ACTION'" && exit 1
		echo "Usage: $0 [scrap|nijobs|all]"
		exit 1
	;;
esac
