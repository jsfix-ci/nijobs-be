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

# Convert data from stackoverflow format to nijobs format
 make nijobs

# Move all relevant data from output/nijobs to data, then zip it
 make accept

# Get state for repo
 make status
```
