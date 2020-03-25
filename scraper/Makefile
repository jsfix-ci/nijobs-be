all:
	@node src/index.js all
scrap:
	@node src/index.js scrap
nijobs:
	@node src/index.js nijobs
accept:
	@node src/index.js accept
status:
	@./scripts/status.sh all
clean:
	@rm -rf output/
# Plumbing...
merge:
	@node src/index.js merge
stats:
	@./scripts/stats.sh all
merge-scrap:
	@node src/index.js merge scrap
merge-nijobs:
	@node src/index.js merge nijobs
stats-scrap:
	@./scripts/stats.sh scrap
stats-nijobs:
	@./scripts/stats.sh nijobs
status-scrap:
	@./scripts/status.sh scrap
status-nijobs:
	@./scripts/status.sh nijobs
status-data:
	@./scripts/status.sh data
clean-scrap:
	@rm -rf output/scrap/
clean-nijobs:
	@rm -rf output/nijobs/
clean-stats:
	@rm -rf output/stats/
