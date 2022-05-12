"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const client_1 = require("@notionhq/client");
const martian_1 = require("@tryfabric/martian");
const notion = new client_1.Client({ auth: process.env.NOTION_ACCESS_TOKEN });
const ROOT_PAGE_ID = '9e0f5e1776a84608a31ca3bfde5babef';
const getPageBlocks = (pageId) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield notion.blocks.children.list({
        block_id: pageId,
        page_size: 50,
    });
    return response.results;
});
const deleteBlock = (blockId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield notion.blocks.delete({
        block_id: blockId,
    });
});
const clearPage = (pageId) => __awaiter(void 0, void 0, void 0, function* () {
    const blocks = yield getPageBlocks(ROOT_PAGE_ID);
    for (let block of blocks) {
        yield deleteBlock(block.id);
    }
});
const addBlocksToPage = (pageId, blocks) => __awaiter(void 0, void 0, void 0, function* () {
    return yield notion.blocks.children.append({
        block_id: pageId,
        children: blocks,
    });
});
const readFileAsString = (filename) => __awaiter(void 0, void 0, void 0, function* () {
    return yield fs_1.default.promises.readFile(filename, { encoding: 'utf-8' });
});
const generateHeaderBlocks = (sourceUrl) => {
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
                        }
                    ] : []),
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
    ];
};
const createPage = (parentPageId, name, sourceUrl) => __awaiter(void 0, void 0, void 0, function* () {
    const page = yield notion.pages.create({
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
    });
    yield addBlocksToPage(page.id, generateHeaderBlocks(sourceUrl));
    return page;
});
const WIKI_ROOT_PATH = 'dave.wiki/';
const REPOSIORY_URL = 'https://github.com/webbhalsa/dave';
(() => __awaiter(void 0, void 0, void 0, function* () {
    const files = yield fs_1.default.promises.readdir(path_1.default.resolve(process.cwd(), WIKI_ROOT_PATH), { withFileTypes: true });
    const markdownFiles = files.filter(file => file.isFile() && file.name.match(/^[^_.]*\.md$/));
    yield clearPage(ROOT_PAGE_ID);
    const wikiPage = yield createPage(ROOT_PAGE_ID, "Wiki", `${REPOSIORY_URL}/wiki`);
    const readmeMarkdown = yield readFileAsString("README.md");
    const readmeBlocks = (0, martian_1.markdownToBlocks)(readmeMarkdown);
    yield addBlocksToPage(ROOT_PAGE_ID, [...generateHeaderBlocks(REPOSIORY_URL), ...readmeBlocks]);
    for (const file of markdownFiles) {
        const fileNameWithoutExtension = file.name.replace(".md", "");
        const page = yield createPage(wikiPage.id, fileNameWithoutExtension, `${REPOSIORY_URL}/wiki/${fileNameWithoutExtension}`);
        const markdownContent = yield readFileAsString(path_1.default.resolve(process.cwd(), WIKI_ROOT_PATH, file.name));
        const blocks = (0, martian_1.markdownToBlocks)(markdownContent);
        yield addBlocksToPage(page.id, blocks);
    }
}))();
