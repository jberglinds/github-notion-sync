import fs from 'fs';
import path from 'path';
import {markdownToBlocks} from '@tryfabric/martian';
import * as notion from "./notion";

const readFileAsString = async (filename: string) => {
    return await fs.promises.readFile(filename, {encoding: 'utf-8'});
}

const sync = async (notionAccessToken: string, notionPageId: string, repository?: string, branch?: string, wikiCheckoutPath?: string) => {
    const notionClient = notion.getClient(notionAccessToken)
    const repositoryUrl = repository && `https://github.com/${repository}`

    const syncMarkdownFileToPage = async (file: string, notionPageId: string) => {
        console.debug(`Syncing file "${file}"...`)
        const markdown = await readFileAsString(path.resolve(process.cwd(), file))
        const blocks = markdownToBlocks(markdown);
        await notionClient.addBlocksToPage(notionPageId, blocks);
        console.debug(`Finished syncing file "${file}"`)
    }

    const syncDirectoryToPage = async (directory: string, notionPageId: string, directorySourceUrl?: string, basePageName?: string) => {

        const name = basePageName ? basePageName + '/' : ''
        const files = await fs.promises.readdir(path.resolve(directory), {withFileTypes: true})
        const markdownFiles = files.filter(file => file.isFile() && file.name.match(/^[^_.]*\.md$/))

        // Add readme contents directly to page if it exists
        const readmeFile = markdownFiles.find(file => file.name.match(/^readme\.md$/i))
        if (readmeFile)
            await syncMarkdownFileToPage(path.resolve(directory, readmeFile.name), notionPageId)

        for (const file of markdownFiles.filter(f => !f.name.match(/^readme\.md$/i))) {
            const fileNameWithoutExtension = file.name.replace(".md", "")
            const page = await notionClient.createPage(notionPageId, fileNameWithoutExtension, directorySourceUrl && `${directorySourceUrl}/${file.name}`)
            await syncMarkdownFileToPage(path.resolve(directory, file.name), page.id)
        }

        const directories = files.filter(file => file.isDirectory() && file.name.match(/^[^.]*$/))
        for (const nestedDirectory of directories) {
            if (wikiCheckoutPath && path.resolve(directory, nestedDirectory.name) === path.resolve(wikiCheckoutPath)) continue
            const nestedDirectoryFiles = await fs.promises.readdir(path.resolve(directory, nestedDirectory.name), {withFileTypes: true})
            const containsMarkdownFiles = nestedDirectoryFiles.find(file => file.isFile() && file.name.match(/^[^_.]*\.md$/))
            if (containsMarkdownFiles) {
                const page = await notionClient.createPage(notionPageId, `${name}${nestedDirectory.name}`, directorySourceUrl && `${directorySourceUrl}/${nestedDirectory.name}`)
                await syncDirectoryToPage(`${directory}/${nestedDirectory.name}`, page.id, directorySourceUrl && `${directorySourceUrl}/${nestedDirectory.name}`)
            } else {
                await syncDirectoryToPage(`${directory}/${nestedDirectory.name}`, notionPageId, directorySourceUrl && `${directorySourceUrl}/${nestedDirectory.name}`, `${name}${nestedDirectory.name}`)
            }
        }
    }

    await notionClient.clearPage(notionPageId);
    await notionClient.addBlocksToPage(notionPageId, notion.generateHeaderBlocks(repositoryUrl))

    if (wikiCheckoutPath) {
        const wikiPage = await notionClient.createPage(notionPageId, "Wiki", repositoryUrl && `${repositoryUrl}/wiki`)
        const wikiFiles = await fs.promises.readdir(path.resolve(process.cwd(), wikiCheckoutPath), {withFileTypes: true})
        const wikiMarkdownFiles = wikiFiles.filter(file => file.isFile() && file.name.match(/^[^_.]*\.md$/))

        for (const file of wikiMarkdownFiles) {
            const fileNameWithoutExtension = file.name.replace(".md", "")
            const page = await notionClient.createPage(wikiPage.id, fileNameWithoutExtension, repositoryUrl && `${repositoryUrl}/wiki/${fileNameWithoutExtension}`)
            const markdownContent = await readFileAsString(path.resolve(process.cwd(), wikiCheckoutPath, file.name))
            await notionClient.addBlocksToPage(page.id, markdownToBlocks(markdownContent));
        }
    }

    await syncDirectoryToPage('.', notionPageId, repositoryUrl && branch && `${repositoryUrl}/blob/${branch}`)
};

export default sync