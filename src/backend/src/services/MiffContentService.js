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

const BaseService = require('./BaseService');
const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');

class MiffContentService extends BaseService {
    async _construct () {
        this.cache = {};
        this.watcher = null;
        this.contentDir = process.env.MIFF_CONTENT_DIR || path.join(process.cwd(), 'content');
    }

    async _init () {
        await this.loadContent();
        this.setupWatcher();
    }

    async loadContent () {
        try {
            const types = ['quests', 'dialogue', 'npcs', 'items'];
            const newCache = {};

            for ( const type of types ) {
                newCache[type] = {};
                const typeDir = path.join(this.contentDir, type);

                try {
                    const files = await fs.readdir(typeDir);

                    for ( const file of files ) {
                        if ( file.endsWith('.json') ) {
                            const filePath = path.join(typeDir, file);
                            try {
                                const content = await fs.readFile(filePath, 'utf-8');
                                const data = JSON.parse(content);
                                const slug = data.slug || path.parse(file).name;
                                newCache[type][slug] = data;
                            } catch ( error ) {
                                this.log.warn(`Failed to load ${file} in ${type}:`, error.message);
                            }
                        }
                    }
                } catch ( error ) {
                    if ( error.code !== 'ENOENT' ) {
                        this.log.warn(`Failed to read ${type} directory:`, error.message);
                    }
                }
            }

            this.cache = newCache;
            this.log.info('Content loaded successfully');
        } catch ( error ) {
            this.log.error('Error loading content:', error);
        }
    }

    setupWatcher () {
        const watchDirs = ['quests', 'dialogue', 'npcs', 'items'].map(type => path.join(this.contentDir, type));

        try {
            this.watcher = chokidar.watch(watchDirs, {
                persistent: true,
                ignoreInitial: true,
                ignored: /node_modules/,
            });

            this.watcher
                .on('add', () => this.loadContent())
                .on('change', () => this.loadContent())
                .on('unlink', () => this.loadContent())
                .on('error', (error) => {
                    this.log.error('Watcher error:', error);
                });

            this.log.info('Content watcher started');
        } catch ( error ) {
            this.log.warn('Failed to setup content watcher:', error.message);
        }
    }

    async getContent () {
        return this.cache;
    }

    async getContentByType (type) {
        if ( ! this.cache[type] ) {
            return null;
        }
        return this.cache[type];
    }

    async getContentByTypeAndSlug (type, slug) {
        if ( !this.cache[type] || !this.cache[type][slug] ) {
            return null;
        }
        return this.cache[type][slug];
    }

    static IMPLEMENTS = {
        ['miff-content']: {
            async getContent () {
                const service = this.ctx.get('services').get('miff-content');
                return await service.getContent();
            },

            async getContentByType (type) {
                const service = this.ctx.get('services').get('miff-content');
                return await service.getContentByType(type);
            },

            async getContentByTypeAndSlug (type, slug) {
                const service = this.ctx.get('services').get('miff-content');
                return await service.getContentByTypeAndSlug(type, slug);
            },
        },
    };

    async __on_cleanup () {
        if ( this.watcher ) {
            await this.watcher.close();
            this.log.info('Content watcher closed');
        }
    }
}

module.exports = { MiffContentService };
