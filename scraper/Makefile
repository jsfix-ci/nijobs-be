.PHONY: all fetch listings visit html scrap raw link adopt
.PHONY: nijobs convert data accept move mongo

all:
	@node src/index.js all
fetch listings:
	@node src/index.js fetch
visit html:
	@node src/index.js visit
scrap raw:
	@node src/index.js scrap
link:
	@node src/index.js link
adopt:
	@node src/index.js adopt
nijobs convert:
	@node src/index.js nijobs
data accept move mongo:
	@node src/index.js accept

clean:
	@rm -rf out/
clean-fetch:
	@rm -rf out/listings/
clean-visit:
	@rm -rf out/html/
clean-scrap:
	@rm -rf out/raw/
clean-link:
	@rm -rf out/link/
clean-orphans:
	@rm -rf out/orphans/
clean-nijobs:
	@rm -rf out/nijobs/
clean-stats:
	@rm -rf out/stats/
clean-data:
	@rm -rf data/

status:
	@./scripts/status.sh all
status-fetch:
	@./scripts/status.sh listings
status-visit:
	@./scripts/status.sh html
status-scrap:
	@./scripts/status.sh raw
status-link:
	@./scripts/status.sh link
status-orphans:
	@./scripts/status.sh orphans
status-nijobs:
	@./scripts/status.sh nijobs
status-stats:
	@./scripts/status.sh stats
status-data:
	@./scripts/status.sh data
