#!/usr/bin/env bash

set -eufo pipefail
ACTION="${1:-all}"

if ! test -d "output"; then
	echo "No scrap or data files"
	exit 0
fi

if ! test -d "output/scrap"; then
	echo "No scrap files"
else
	if ! test -f "output/scrap/all_jobs.json"; then
		echo "No jobs scrap file"
	else
		jobs=$(jq '.[].id' output/scrap/all_jobs.json | wc -l)
		echo "$jobs in all_jobs.json"
	fi
	if ! test -d "output/scrap/jobs"; then
		echo "No jobs directory file"
	else
		jobs=$(ls -1 output/scrap/jobs | grep -E 'json$' | wc -l)
		echo "$jobs in jobs/"
	fi
fi
