#!/usr/bin/env bash

set -eufo pipefail
ACTION="${1:-all}"

case $ACTION in
	scrap)
		test -d "output" || return 0
		rm -rf "output/scrap/"
	;;
	convert)
		test -d "output" || return 0
		rm -rf "output/nijobs/"
	;;
	stats)
		test -d "output" || return 0
		set +f
		rm -rf "output/stats/" output/*/stats/
	;;
	clean|all)
		rm -rf "output"
	;;
	*)
		echo "Unknown action '$ACTION'"
		echo "Usage: $0 [scrap|convert|stats|all]"
		exit 1
	;;
esac
