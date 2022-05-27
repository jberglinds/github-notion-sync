# Github Notion Sync
## What?
Tool for syncing markdown files and wikis from a Github repository into Notion.

## Why?
Because we like our documentation to live with the resources it documents, yet still be searchable from one place.

## Let's go!™️
**Requirements:**
* The ID of the page in Notion where you want your documentation to end up.
* An access key for an integration with permissions to edit the above page.
  * An integration can be created [here](https://www.notion.so/my-integrations).
  * Use the _"Share"_ button on a Notion page to give the integration permissions.

### CLI
```bash
# Getting it
git clone git@github.com:jberglinds/github-notion-sync.git
cd github-notion-sync

# Syncing example, will use the current working directory as content root
npx ts-node src/cli.ts \
  --notionAccessToken <token>
  --notionPageId <page id> \
  # Optional, set if syncing wiki:
  --wikiCheckoutPath wiki/ \
  # Optional arguments for backlinking to github from Notion:
  --repository webbhalsa/dave \
  --branch release
 
# See help
npx ts-node src/cli.ts --help
```

### Github Workflow
The `secrets.NOTION_ACCESS_TOKEN` should be set up in **Repository Settings -> Secrets -> Actions**.

Example workflow:
```yaml
# ./github/workflows/notion-sync.yml
name: Notion Sync

on:
  workflow_dispatch:
  gollum:

jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Checkout wiki
        uses: actions/checkout@v3
        with:
          repository: ${{ github.repository }}.wiki
          path: wiki

      - uses: jberglinds/github-notion-sync@main
        with:
          NOTION_ACCESS_TOKEN: ${{ secrets.NOTION_ACCESS_TOKEN }}
          NOTION_PAGE_ID: <your notion page id that will become the root of documentation>
          WIKI_CHECKOUT_PATH: wiki # optional
```
The `gollum` event triggers the workflow every time a wiki page is changed.