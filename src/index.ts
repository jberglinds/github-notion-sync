import fs from 'fs';
import path from 'path';
import {Client} from '@notionhq/client'
import {markdownToBlocks, markdownToRichText} from '@tryfabric/martian';
import {Block} from "@tryfabric/martian/build/src/notion";

const notion = new Client({auth: process.env.NOTION_ACCESS_TOKEN});

const ROOT_PAGE_ID = '9e0f5e1776a84608a31ca3bfde5babef';

const getPageBlocks = async (pageId: string) => {
    const response = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 50,
    });
    return response.results
};

const deleteBlock = async (blockId: string) =>
    await notion.blocks.delete({
        block_id: blockId,
    });

const clearPage = async (pageId: string) => {
    const blocks = await getPageBlocks(ROOT_PAGE_ID);
    for (let block of blocks) {
        await deleteBlock(block.id)
    }
}

const addBlocksToPage = async (pageId: string, blocks: Block[]) => {
    return await notion.blocks.children.append({
        block_id: pageId,
        children: blocks as any,
    })
};

const readFileAsString = async (filename: string) => {
    return await fs.promises.readFile(filename, {encoding: 'utf-8'});
}

const generateHeaderBlocks = (sourceUrl: string | undefined): Block[] => {
    return [
        {
            object: "block",
            type: "callout",
            callout: {
                rich_text: [
                    {
                        type: "text",
                        text: {
                            content: `This page was automatically generated from Github.`,
                            link: null
                        },
                    },
                    ...(sourceUrl ? [
                        {
                            type: "text",
                            text: {
                                content: `\nSource: `,
                                link: null
                            },
                        },
                        {
                            type: 'text',
                            text: {
                                content: sourceUrl,
                                link: {
                                    url: sourceUrl
                                }
                            },
                        }] as any : []),
                ],
                icon: {
                    type: "emoji",
                    emoji: "💡"
                },
                color: "blue_background"
            }
        },
        {
            object: "block",
            type: "callout",
            callout: {
                rich_text: [
                    {
                        type: "text",
                        text: {
                            content: "Do not make changes to this page!\nAny changes made will be discarded when the source document changes.",
                            link: null
                        },
                    }
                ],
                icon: {
                    type: "emoji",
                    emoji: "❗"
                },
                color: "red_background"
            }
        }
    ]
}

const createPage = async (parentPageId: string, name: string, sourceUrl: string | undefined) => {
    const page = await notion.pages.create({
        parent: {
            type: 'page_id',
            page_id: parentPageId
        },
        properties: {
            title: [{
                text: {
                    content: name
                }
            }]
        }
    })
    await addBlocksToPage(page.id, generateHeaderBlocks(sourceUrl))
    return page
}

const WIKI_ROOT_PATH = 'dave.wiki/';
const REPOSIORY_URL = 'https://github.com/webbhalsa/dave';
(async () => {
    const files = await fs.promises.readdir(path.resolve(process.cwd(), WIKI_ROOT_PATH), {withFileTypes: true})
    const markdownFiles = files.filter(file => file.isFile() && file.name.match(/^[^_.]*\.md$/))

    await clearPage(ROOT_PAGE_ID);

    const wikiPage = await createPage(ROOT_PAGE_ID, "Wiki", `${REPOSIORY_URL}/wiki`)

    const readmeMarkdown = await readFileAsString("README.md")
    const readmeBlocks = markdownToBlocks(readmeMarkdown);
    await addBlocksToPage(ROOT_PAGE_ID, [...generateHeaderBlocks(REPOSIORY_URL) as any, ...readmeBlocks]);

    for (const file of markdownFiles) {
        const fileNameWithoutExtension = file.name.replace(".md", "")
        const page = await createPage(wikiPage.id, fileNameWithoutExtension, `${REPOSIORY_URL}/wiki/${fileNameWithoutExtension}`)
        const markdownContent = await readFileAsString(path.resolve(process.cwd(), WIKI_ROOT_PATH, file.name))
        const blocks = markdownToBlocks(markdownContent);
        await addBlocksToPage(page.id, blocks);
    }
})();