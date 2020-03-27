# Order

## Fetch
Fetch html listing pages into `out/listings`
- Input: configuration
  <-- `.env.local`
- Output: listing pages html
  --> `out/listings/**.html`

## Visit
Scrap the html listing pages (basic scrap) and get job ids and company ids.
Then visit their pages and output html to `out/html/`
- Input: listing pages html
  <-- `out/listings/**.html`
- Output: details pages html
  --> `out/html/**.html`

## Scrap
Scrap the details pages html, converting them to json/yaml.
- Input: details pages html
  <-- `out/html/**.html`
- Output: raw jobs,companies
  --> `out/raw/**.yaml`

## Link
Link jobs and companies and identify orphan jobs with no companies
- Input: raw jobs,companies
  <-- `out/raw/**.yaml`
- Output: associations
  --> `out/link/**.yaml`
  --> `out/orphan/**.yaml`

## Adopt
Fetch missing companies for orphan jobs.
- Input: orphan jobs
  <-- `out/orphan/*.yaml`
- Output: nijobs offers and nijobs companies
  --> `out/raw/companies/*.yaml`
  --> `out/link/**.yaml`

## Convert
Convert linked jobs and companies to nijobs offers and companies
- Input: jobs and companies linked
  <-- `out/link/**.yaml`
- Output: nijobs offers and companies
  --> `out/nijobs/**.yaml`

## Accept
Move the generated nijobs offers and companies.
- Input: nijobs offers and nijobs companies
  <-- `out/nijobs/**.yaml`
- Output: data
  --> `data/*.json`
