#!/usr/bin/env bash

set -eufo pipefail
ACTION="${1:-all}"

any_of() {
	for option in "$@"; do
		if test "$ACTION" = "$option"; then return 0; fi
	done
	return 1
}
print_listings() { any_of "all" "listings" "fetch" ; }
print_html() { any_of "all" "html" "visit" ; }
print_raw() { any_of "all" "raw" "scrap" ; }
print_link() { any_of "all" "link" "adopt" ; }
print_orphans() { any_of "all" "orphan" "orphans" ; }
print_nijobs() { any_of "all" "nijobs" "convert" ; }
print_data() { any_of "all" "data" "accept" "mongo" "done" ; }

count_files() {
	local count
	if test -d "$2"; then
		count=$(find "$2" -name "*.$1" 2>/dev/null | wc -l || true)
	else
		count=0
	fi
	echo -e "$count\t\t${3:-$2}"
}
count_json_keys() {
	local count
	if test -f "$1"; then
		count=$(jq 'length' "$1")
	else
		count=0
	fi
	echo -e "$count\t\t${2:-$1}"
}
count_html_files() { count_files "html" "$1" "$2" ; }
count_yaml_files() { count_files "yaml" "$1" "$2" ; }

if ! test -d "out" && ! test -d "data"; then
	exit 0
fi

if print_listings && test -d "out/listings/"; then
	echo "------- listings"
	count_html_files "out/listings/offers/"    "offer listings"
	count_html_files "out/listings/companies/" "company listings"
fi

if print_html && test -d "out/html/"; then
	echo "------- visit"
	count_html_files "out/html/offers/"    "offer html pages"
	count_html_files "out/html/companies/" "company html pages"
fi

if print_raw && test -d "out/raw/"; then
	echo "------- scrap"
	count_yaml_files "out/raw/offers/"    "raw offers"
	count_yaml_files "out/raw/companies/" "raw companies"
fi

if print_link && test -d "out/link/"; then
	echo "------- link"
	count_yaml_files "out/link/offers/"    "linked offers"
	count_yaml_files "out/link/companies/" "linked companies"
fi

if print_orphans && test -d "out/orphans/"; then
	echo "------- orphans"
	count_yaml_files "out/orphans/" "orphan offers"
fi

if print_nijobs && test -d "out/nijobs/"; then
	echo "------- nijobs"
	count_yaml_files "out/nijobs/offers/"    "nijobs offers"
	count_yaml_files "out/nijobs/companies/" "nijobs companies"
fi

if print_data && test -d "data"; then
	echo "------- data"
	count_json_keys "data/offers.json"
	count_json_keys "data/companies.json"
fi
