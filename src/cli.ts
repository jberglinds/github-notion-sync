import yargs from 'yargs';
import sync from './index'

const args = yargs
    .version(false)
    .help(false)
    .options({
        notionAccessToken: {
            type: 'string',
            demandOption: true,
            description: 'Access token to access Notion API. Should be granted access to the page id. Can also be set through the environment variable NOTION_ACCESS_TOKEN.'
        },
        notionPageId: {
            type: 'string',
            demandOption: true,
            description: 'The page ID where the data will be synced. Contents and subpages will be replaced. Make sure the access token has been given access to the page.'
        },
        repository: {
            type: 'string',
            description: 'The name of the repository, used to link back from Notion to the repo. Should normally be set to the github.repository parameter'
        },
        wikiCheckoutPath: {
            type: 'string',
            description: 'The path where the wiki of the repo is checked out. If not set, wiki will not be exported to Notion.'
        },
    })
    .config({
        notionAccessToken: process.env["NOTION_ACCESS_TOKEN"]
    })
    .strictOptions(true)
    .parse(process.argv);

// @ts-ignore
(async () => sync(args.notionAccessToken, args.notionPageId, args.repository, args.wikiCheckoutPath))()
