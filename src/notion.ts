import {Client as NotionClient} from '@notionhq/client'
import {Block} from "@tryfabric/martian/build/src/notion";

export const getClient = (notionAccessToken: string) => {
    const notion = new NotionClient({auth: notionAccessToken})

    const getPageBlocks = async (pageId: string) => {
        const response = await notion.blocks.children.list({
            block_id: pageId,
            page_size: 50,
        });
        return response.results
    };

    const deleteBlock = async (blockId: string) => {
        console.debug(`Deleting block with id "${blockId}"...`)
        await notion.blocks.delete({
            block_id: blockId,
        });
        console.debug(`Finished deleting block with id "${blockId}"`)
    }

    const clearPage = async (pageId: string) => {
        console.debug(`Clearing page with id "${pageId}"...`)
        const blocks = await getPageBlocks(pageId);
        for (let block of blocks) {
            await deleteBlock(block.id)
        }
        console.debug(`Finished clearing page with id "${pageId}"`)
    };

    const addBlocksToPage = async (pageId: string, blocks: Block[]) => {
        console.debug(`Adding blocks to page with id "${pageId}"...`)
        const response = await notion.blocks.children.append({
            block_id: pageId,
            children: blocks as any,
        })
        console.debug(`Finished adding blocks to page with id "${pageId}"`)
        return response
    };

    const createPage = async (parentPageId: string, name: string, sourceUrl?: string) => {
        console.debug(`Creating page "${name}" with parent page id "${parentPageId}"...`)
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
        console.debug(`Created page with id "${page.id}"`)
        await addBlocksToPage(page.id, generateHeaderBlocks(sourceUrl))
        return page
    };

    return {
        clearPage,
        createPage,
        addBlocksToPage,
        deleteBlock,
    }
}


export const generateHeaderBlocks = (sourceUrl?: string): Block[] => {
    return [
        {
            object: "block",
            type: "callout",
            callout: {
                rich_text: [
                    {
                        type: "text",
                        text: {
                            content: `This page was automatically generated from ${sourceUrl?.includes("github") ? "Github" : "markdown"}.`,
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