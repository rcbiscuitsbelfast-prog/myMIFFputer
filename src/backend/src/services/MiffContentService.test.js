/*
 * Copyright (C) 2024-present Puter Technologies Inc.
 *
 * This file is part of Puter.
 *
 * Puter is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const { MiffContentService } = require('./MiffContentService');

describe('MiffContentService', () => {
    let service;
    let tempDir;
    let mockServices;
    let mockLog;

    beforeEach(async () => {
        tempDir = path.join(os.tmpdir(), `miff-test-${Date.now()}`);
        await fs.mkdir(tempDir, { recursive: true });

        mockLog = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
        };

        mockServices = {
            get: vi.fn(),
        };

        service = new MiffContentService({
            services: mockServices,
            config: {},
            name: 'miff-content',
            args: {},
            context: { get: vi.fn() },
        });

        service.contentDir = tempDir;
        service.log = mockLog;
    });

    afterEach(async () => {
        if (service.watcher) {
            await service.watcher.close();
        }
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    describe('loadContent', () => {
        it('should load valid JSON files from content directories', async () => {
            const questsDir = path.join(tempDir, 'quests');
            await fs.mkdir(questsDir, { recursive: true });

            const questData = {
                slug: 'test-quest',
                title: 'Test Quest',
                description: 'A test quest',
                objectives: [],
                rewards: { experience: 100, items: [] },
            };

            await fs.writeFile(
                path.join(questsDir, 'test-quest.json'),
                JSON.stringify(questData)
            );

            await service.loadContent();

            expect(service.cache.quests['test-quest']).toEqual(questData);
        });

        it('should handle malformed JSON files gracefully', async () => {
            const npcsDir = path.join(tempDir, 'npcs');
            await fs.mkdir(npcsDir, { recursive: true });

            await fs.writeFile(
                path.join(npcsDir, 'bad.json'),
                '{ invalid json }'
            );

            await service.loadContent();

            expect(mockLog.warn).toHaveBeenCalled();
            expect(service.cache.npcs).toEqual({});
        });

        it('should handle empty directories', async () => {
            const itemsDir = path.join(tempDir, 'items');
            await fs.mkdir(itemsDir, { recursive: true });

            await service.loadContent();

            expect(service.cache.items).toEqual({});
        });

        it('should ignore non-JSON files', async () => {
            const dialogueDir = path.join(tempDir, 'dialogue');
            await fs.mkdir(dialogueDir, { recursive: true });

            await fs.writeFile(path.join(dialogueDir, 'readme.txt'), 'This should be ignored');
            await fs.writeFile(path.join(dialogueDir, 'SCHEMA.ts'), 'interface Dialogue {}');

            await service.loadContent();

            expect(service.cache.dialogue).toEqual({});
        });

        it('should handle missing directories', async () => {
            // Don't create any directories
            await service.loadContent();

            expect(service.cache.quests).toEqual({});
            expect(service.cache.dialogue).toEqual({});
            expect(service.cache.npcs).toEqual({});
            expect(service.cache.items).toEqual({});
        });

        it('should initialize all content type caches', async () => {
            await service.loadContent();

            expect(service.cache).toHaveProperty('quests');
            expect(service.cache).toHaveProperty('dialogue');
            expect(service.cache).toHaveProperty('npcs');
            expect(service.cache).toHaveProperty('items');
        });

        it('should use slug from JSON if available', async () => {
            const questsDir = path.join(tempDir, 'quests');
            await fs.mkdir(questsDir, { recursive: true });

            const questData = {
                slug: 'custom-slug',
                title: 'Quest',
            };

            await fs.writeFile(
                path.join(questsDir, 'different-filename.json'),
                JSON.stringify(questData)
            );

            await service.loadContent();

            expect(service.cache.quests['custom-slug']).toEqual(questData);
        });

        it('should use filename as slug if slug not in JSON', async () => {
            const npcsDir = path.join(tempDir, 'npcs');
            await fs.mkdir(npcsDir, { recursive: true });

            const npcData = {
                name: 'NPC Name',
            };

            await fs.writeFile(
                path.join(npcsDir, 'my-npc.json'),
                JSON.stringify(npcData)
            );

            await service.loadContent();

            expect(service.cache.npcs['my-npc']).toEqual(npcData);
        });

        it('should handle multiple files in a single directory', async () => {
            const itemsDir = path.join(tempDir, 'items');
            await fs.mkdir(itemsDir, { recursive: true });

            const item1 = { slug: 'item-1', name: 'Item 1' };
            const item2 = { slug: 'item-2', name: 'Item 2' };

            await fs.writeFile(path.join(itemsDir, 'item-1.json'), JSON.stringify(item1));
            await fs.writeFile(path.join(itemsDir, 'item-2.json'), JSON.stringify(item2));

            await service.loadContent();

            expect(service.cache.items['item-1']).toEqual(item1);
            expect(service.cache.items['item-2']).toEqual(item2);
        });
    });

    describe('getContent', () => {
        it('should return all cached content', async () => {
            const questsDir = path.join(tempDir, 'quests');
            await fs.mkdir(questsDir, { recursive: true });

            const questData = { slug: 'quest-1', title: 'Quest 1' };
            await fs.writeFile(path.join(questsDir, 'quest-1.json'), JSON.stringify(questData));

            await service.loadContent();
            const content = await service.getContent();

            expect(content.quests['quest-1']).toEqual(questData);
        });
    });

    describe('getContentByType', () => {
        it('should return content for a specific type', async () => {
            const npcsDir = path.join(tempDir, 'npcs');
            await fs.mkdir(npcsDir, { recursive: true });

            const npcData = { slug: 'npc-1', name: 'NPC 1' };
            await fs.writeFile(path.join(npcsDir, 'npc-1.json'), JSON.stringify(npcData));

            await service.loadContent();
            const npcs = await service.getContentByType('npcs');

            expect(npcs).toEqual({ 'npc-1': npcData });
        });

        it('should return null for invalid content type', async () => {
            await service.loadContent();
            const result = await service.getContentByType('invalid');

            expect(result).toBeNull();
        });

        it('should return empty object for type with no content', async () => {
            const dialogueDir = path.join(tempDir, 'dialogue');
            await fs.mkdir(dialogueDir, { recursive: true });

            await service.loadContent();
            const dialogues = await service.getContentByType('dialogue');

            expect(dialogues).toEqual({});
        });
    });

    describe('getContentByTypeAndSlug', () => {
        it('should return a specific content item', async () => {
            const itemsDir = path.join(tempDir, 'items');
            await fs.mkdir(itemsDir, { recursive: true });

            const itemData = { slug: 'sword', name: 'Iron Sword', value: 100 };
            await fs.writeFile(path.join(itemsDir, 'sword.json'), JSON.stringify(itemData));

            await service.loadContent();
            const item = await service.getContentByTypeAndSlug('items', 'sword');

            expect(item).toEqual(itemData);
        });

        it('should return null for non-existent slug', async () => {
            const itemsDir = path.join(tempDir, 'items');
            await fs.mkdir(itemsDir, { recursive: true });

            await service.loadContent();
            const result = await service.getContentByTypeAndSlug('items', 'nonexistent');

            expect(result).toBeNull();
        });

        it('should return null for invalid type', async () => {
            await service.loadContent();
            const result = await service.getContentByTypeAndSlug('invalid', 'slug');

            expect(result).toBeNull();
        });
    });

    describe('error handling', () => {
        it('should log warnings for files that cannot be read', async () => {
            const questsDir = path.join(tempDir, 'quests');
            await fs.mkdir(questsDir, { recursive: true });

            await fs.writeFile(path.join(questsDir, 'bad.json'), '{ broken');

            await service.loadContent();

            expect(mockLog.warn).toHaveBeenCalled();
            const warnCalls = mockLog.warn.mock.calls;
            expect(warnCalls.some(call => 
                call[0].includes('Failed to load')
            )).toBe(true);
        });

        it('should continue loading other files if one fails', async () => {
            const questsDir = path.join(tempDir, 'quests');
            await fs.mkdir(questsDir, { recursive: true });

            const goodQuest = { slug: 'good', title: 'Good Quest' };
            await fs.writeFile(path.join(questsDir, 'good.json'), JSON.stringify(goodQuest));
            await fs.writeFile(path.join(questsDir, 'bad.json'), '{ invalid');

            await service.loadContent();

            expect(service.cache.quests['good']).toEqual(goodQuest);
        });
    });

    describe('cache management', () => {
        it('should maintain cache between calls', async () => {
            const questsDir = path.join(tempDir, 'quests');
            await fs.mkdir(questsDir, { recursive: true });

            const questData = { slug: 'cached', title: 'Cached Quest' };
            await fs.writeFile(path.join(questsDir, 'cached.json'), JSON.stringify(questData));

            await service.loadContent();

            const content1 = await service.getContent();
            const content2 = await service.getContent();

            expect(content1).toBe(content2);
        });
    });
});
