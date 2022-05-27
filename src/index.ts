import fs from 'fs';
import path from 'path';
import {markdownToBlocks} from '@tryfabric/martian';
import * as notion from "./notion";

const readFileAsString = async (filename: string) => {
    return await fs.promises.readFile(filename, {encoding: 'utf-8'});
}

const sync = async (notionAccessToken: string, notionPageId: string, repository?: string, wikiCheckoutPath?: string) => {
    const notionClient = notion.getClient(notionAccessToken)
    const repositoryUrl = repository && `https://github.com/${repository}`

    await notionClient.clearPage(notionPageId);

    const readmeMarkdown = await readFileAsString("README.md")
    const readmeBlocks = markdownToBlocks(readmeMarkdown);
    await notionClient.addBlocksToPage(notionPageId, [...notion.generateHeaderBlocks(repositoryUrl) as any, ...readmeBlocks]);

    if (!wikiCheckoutPath) return
    const wikiFiles = await fs.promises.readdir(path.resolve(process.cwd(), wikiCheckoutPath), {withFileTypes: true})
    const wikiMarkdownFiles = wikiFiles.filter(file => file.isFile() && file.name.match(/^[^_.]*\.md$/))
    const wikiPage = await notionClient.createPage(notionPageId, "Wiki", repositoryUrl && `${repositoryUrl}/wiki` )

    for (const file of wikiMarkdownFiles) {
        const fileNameWithoutExtension = file.name.replace(".md", "")
        const page = await notionClient.createPage(wikiPage.id, fileNameWithoutExtension, repositoryUrl && `${repositoryUrl}/wiki/${fileNameWithoutExtension}`)
        const markdownContent = await readFileAsString(path.resolve(process.cwd(), wikiCheckoutPath, file.name))
        const blocks = markdownToBlocks(markdownContent);
        await notionClient.addBlocksToPage(page.id, blocks);
    }
};

export default sync