# StackOverflow scraper

Scrap, get statistics and agglomerate all data, making it ready for use.
Data includes offers and companies.

```
# TL;DR
 npm install
 make
# >
#   data/offers.json
#   data/companies.json

# Other commands...

# Scrap and write raw data to output/scrap
make scrap

# Collect stats and write it to output/stats for inspection
make stats

# Convert data from stackoverflow format to nijobs format
make convert

# Move all relevant data from output/nijobs to data, then zip it
make accept
make zip

# Merge the collections in the directories into their agglomerate files
make merge-scrap        # scrap data
make merge-convert      # converted data
```
