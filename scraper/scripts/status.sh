#!/usr/bin/env bash

set -eufo pipefail
ACTION="${1:-all}"

print_tree() { test "$ACTION" = "all" ; }
print_scrap() { test "$ACTION" = "all" || test "$ACTION" = "scrap" ; }
print_nijobs() { test "$ACTION" = "all" || test "$ACTION" = "nijobs" ; }
print_data() { test "$ACTION" = "all" || test "$ACTION" = "data" ; }

simple_tree() {
	test -d "$1" || return 0
	tree --si --noreport --timefmt='%H:%m' --dirsfirst -CDL 2 "$1"
}
count_yaml_files() {
	test -d "$1" || return 0
	local count
	count=$(find "$1" -name '*.yaml' | wc -l)
	echo -e "$count\t\t$1"
}
count_json_keys() {
	test -f "$1" || return 0
	local count
	count=$(jq '.[].id' "$1" | wc -l)
	echo -e "$count\t\t$1"
}
overall() {
	test -f "output/$1/stats/overall" || return 0
	echo "----- $1 stats"
	grep -Eve '^\s*#|^\s*$' <"output/$1/stats/overall"
}

if ! test -d "output" && ! test -d "data"; then
	echo "No scrap or data files"
	exit 0
fi

if print_tree; then
	simple_tree "output/"
	simple_tree "data/"
fi

if print_scrap && test -d "output/scrap/"; then
	echo "---------- scrap"
	count_yaml_files "output/scrap/jobs/"
	count_yaml_files "output/scrap/companies/"
	count_yaml_files "output/scrap/pages/"
	count_json_keys "output/scrap/all_jobs.json"
	count_json_keys "output/scrap/all_companies.json"
	overall "scrap"
fi

if print_nijobs && test -d "output/nijobs/"; then
	echo "---------- nijobs"
	count_yaml_files "output/nijobs/offers/"
	count_yaml_files "output/nijobs/companies/"
	count_json_keys "output/nijobs/all_offers.json"
	count_json_keys "output/nijobs/all_companies.json"
	overall "nijobs"
fi

if print_data && test -d "data"; then
	echo "---------- data"
	count_json_keys "data/offers.json"
	count_json_keys "data/companies.json"
fi
