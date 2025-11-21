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
'use strict';
const express = require('express');
const router = new express.Router();
const subdomain = require('../middleware/subdomain');

// -----------------------------------------------------------------------//
// GET /api/miff/content
// -----------------------------------------------------------------------//
router.get('/miff/content',
                subdomain('api'),
                express.json(),
                async (req, res) => {
                    // /!\ open brace on end of previous line

                    try {
                        const miffContentService = req.services.get('miff-content');
                        const content = await miffContentService.getContent();
                        return res.send(content);
                    } catch ( error ) {
                        console.error('Error fetching MIFF content:', error);
                        return res.status(500).send({ error: 'Failed to fetch MIFF content' });
                    }
                });

// -----------------------------------------------------------------------//
// GET /api/miff/content/:type
// -----------------------------------------------------------------------//
router.get('/miff/content/:type',
                subdomain('api'),
                express.json(),
                async (req, res) => {
                    // /!\ open brace on end of previous line

                    try {
                        const { type } = req.params;
                        const miffContentService = req.services.get('miff-content');
                        const content = await miffContentService.getContentByType(type);

                        if ( content === null ) {
                            return res.status(404).send({ error: `Content type '${type}' not found` });
                        }

                        return res.send(content);
                    } catch ( error ) {
                        console.error('Error fetching MIFF content by type:', error);
                        return res.status(500).send({ error: 'Failed to fetch MIFF content by type' });
                    }
                });

// -----------------------------------------------------------------------//
// GET /api/miff/content/:type/:slug
// -----------------------------------------------------------------------//
router.get('/miff/content/:type/:slug',
                subdomain('api'),
                express.json(),
                async (req, res) => {
                    // /!\ open brace on end of previous line

                    try {
                        const { type, slug } = req.params;
                        const miffContentService = req.services.get('miff-content');
                        const content = await miffContentService.getContentByTypeAndSlug(type, slug);

                        if ( content === null ) {
                            return res.status(404).send({ error: `Content '${slug}' of type '${type}' not found` });
                        }

                        return res.send(content);
                    } catch ( error ) {
                        console.error('Error fetching MIFF content by type and slug:', error);
                        return res.status(500).send({ error: 'Failed to fetch MIFF content' });
                    }
                });

module.exports = router;
