import * as gha from '@actions/core'
import sync from "./index";

const NOTION_ACCESS_TOKEN = gha.getInput("NOTION_ACCESS_TOKEN", {required: true});
const NOTION_PAGE_ID = gha.getInput("NOTION_PAGE_ID", {required: true});
const REPOSITORY = process.env['GITHUB_REPOSITORY']
const BRANCH = process.env['GITHUB_REF_NAME']
const WIKI_CHECKOUT_PATH = gha.getInput("WIKI_CHECKOUT_PATH");

(async () => sync(NOTION_ACCESS_TOKEN, NOTION_PAGE_ID, REPOSITORY, BRANCH, WIKI_CHECKOUT_PATH))()
