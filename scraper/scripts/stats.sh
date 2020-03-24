#!/usr/bin/env bash

set -eufo pipefail
ACTION="$1"

if ! command -v jq >/dev/null; then
    echo "Need 'jq' to get statistics. Please install jq."
    exit 2
fi

val() { awk "BEGIN{print $*}"; }

function stats_scrap() {
	local SCRAP="output/scrap"
	local STATS="output/scrap/stats"
	local ALL="output/scrap/all_jobs.json"
	local COMP="output/scrap/all_companies.json"

	if ! test -d "$SCRAP"; then
		echo "$SCRAP is missing; you need to scrap first"
		echo "  $ make scrap"
		exit 1
	fi
	if ! test -f "$ALL"; then
		echo "$ALL is missing; you need to merge first"
		echo "	$ make merge"
		exit 1
	fi

	mkdir -p "$STATS"

	jq '.[].id' "$ALL" |
		sed -e 's/"//g' | sort >"$STATS/ids"

	jq '.[].company' "$ALL" |
		sort | uniq -c | sort -nr >"$STATS/company_count"

    jq '.[].tags[]' "$ALL" |
		sort | uniq -c | sort -nr >"$STATS/tag_count"

	jq '.[]|([.id, .title])|join("  ")' "$ALL" |
		sed -r -e 's/^"//' -e 's/"$//' | sort > "$STATS/titles"

	printf '' > "$STATS/overall"
	local O C T

	O=$(wc -l "$STATS/ids" | cut -f1 -d' ')
	printf 'Number of jobs: %d\n' "$O" >>"$STATS/overall"

	C=$(ls -1 "$SCRAP/companies" | wc -l | cut -f1 -d' ')
	printf 'Number of companies: %d\n' "$C" >>"$STATS/overall"

	if ((O > 0)); then
		T=$(awk '{s+=$1} END {print s}' "$STATS/tag_count")
		printf 'Average tags/job: %f\n' $(val "$T/$O") >>"$STATS/overall"
	fi

	if ((C > 0)); then
		printf 'Average jobs/company: %f\n' $(val "$O/$C") >>"$STATS/overall"
	fi

	echo "scrap:"
	cat "$STATS/overall"
	echo "----------"
}

function stats_nijobs() {
	local NIJOBS="output/nijobs"
	local STATS="output/nijobs/stats"
	local ALL="output/nijobs/all_offers.json"
	local COMP="output/nijobs/all_companies.json"

	if ! test -d "$NIJOBS"; then
		echo "$NIJOBS is missing; you need to convert first"
		echo "  $ make convert"
		exit 1
	fi
	if ! test -f "$ALL"; then
		echo "$ALL is missing; you need to merge first"
		echo "	$ make merge-nijobs"
		exit 1
	fi

	mkdir -p "$STATS"

	jq '.[].id' "$ALL" |
		sed -r -e 's/^"//' -e 's/"$//' | sort >"$STATS/ids"

	jq '.[].company' "$ALL" |
		sort | uniq -c | sort -nr >"$STATS/company_count"

    jq '.[].technologies[]' "$ALL" |
		sort | uniq -c | sort -nr >"$STATS/technology_count"

	jq '.[].fields[]' "$ALL" |
		sort | uniq -c | sort -nr >"$STATS/field_count"

	jq '.[]|([.id, .title])|join("  ")' "$ALL" |
		sort | sed -r -e 's/^"//' -e 's/"$//' >"$STATS/titles"

	printf '' > "$STATS/overall"
	local O C T F

	O=$(wc -l "$STATS/ids" | cut -f1 -d' ')
	printf 'Number of offers: %d\n' "$O" >>"$STATS/overall"

	C=$(ls -1 "$NIJOBS/companies" | wc -l | cut -f1 -d' ')
	printf 'Number of companies: %d\n' "$C" >>"$STATS/overall"

	if ((O > 0)); then
		T=$(awk '{s+=$1} END {print s}' "$STATS/technology_count")
		printf 'Average technologies/offer: %f\n' $(val "$T/$O") >>"$STATS/overall"

		F=$(awk '{s+=$1} END {print s}' "$STATS/field_count")
		printf 'Average fields/offer: %f\n' $(val "$F/$O") >>"$STATS/overall"
	fi

	if ((C > 0)); then
		printf 'Average offers/company: %f\n' $(val "$O/$C") >>"$STATS/overall"
	fi

	echo "nijobs:"
	cat "$STATS/overall"
	echo "----------"
}

case $ACTION in
	scrap) stats_scrap;;
	convert) stats_nijobs;;
	stats|all) stats_scrap && stats_nijobs;;
	*)
		echo "Unknown command '$ACTION'" && exit 1
		echo "Usage: $0 [scrap|convert|all]"
		exit 1
	;;
esac
