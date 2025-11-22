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
"use strict";

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
const request = require('supertest');
const express = require('express');

describe('MIFF LLM Router Integration Tests', () => {
    let app;
    let mockMIFFService;
    let mockServices;

    beforeEach(() => {
        // Mock the MIFF LLM Proxy service
        mockMIFFService = {
            proxyChatCompletion: vi.fn(),
            isConfigured: vi.fn().returns(true),
            provider: 'together',
            model: 'test-model',
            rateLimitWindow: 60000,
            rateLimitMax: 10,
            timeout: 30000
        };

        mockServices = {
            get: vi.fn().withArgs('miff-llm-proxy').returns(mockMIFFService)
        };

        // Create express app with middleware to add services to request
        app = express();
        app.use(express.json());
        app.use((req, res, next) => {
            req.services = mockServices;
            req.ip = '127.0.0.1';
            next();
        });

        // Mount the router
        const router = require('./miff-llm.js');
        app.use(router);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('POST /api/miff/llm/chat', () => {
        it('should successfully process chat completion request', async () => {
            // Mock successful response
            mockMIFFService.proxyChatCompletion.mockResolvedValue({
                choices: [{
                    message: {
                        role: 'assistant',
                        content: 'Hello! How can I help you on your quest?'
                    },
                    finish_reason: 'stop'
                }],
                usage: {
                    prompt_tokens: 20,
                    completion_tokens: 15,
                    total_tokens: 35
                },
                model: 'test-model'
            });

            const response = await request(app)
                .post('/api/miff/llm/chat')
                .send({
                    messages: [
                        { role: 'user', content: 'Hello, I need help with my quest' }
                    ]
                });

            expect(response.status).toBe(200);
            expect(response.body.choices).toBeDefined();
            expect(response.body.choices).toHaveLength(1);
            expect(response.body.choices[0].message.role).toBe('assistant');
            expect(response.body.processing_time_ms).toBeDefined();
            expect(response.body.processing_time_ms).toBeGreaterThanOrEqual(0);
        });

        it('should inject MIFF context when provided', async () => {
            mockMIFFService.proxyChatCompletion.mockResolvedValue({
                choices: [{
                    message: {
                        role: 'assistant',
                        content: 'I see you are on the quest to find the lost artifact!'
                    },
                    finish_reason: 'stop'
                }],
                usage: {
                    prompt_tokens: 25,
                    completion_tokens: 18,
                    total_tokens: 43
                },
                model: 'test-model'
            });

            const response = await request(app)
                .post('/api/miff/llm/chat')
                .send({
                    messages: [
                        { role: 'user', content: 'What should I do next?' }
                    ],
                    context: {
                        currentQuest: 'Find the lost artifact',
                        playerCharacter: { name: 'Aria', class: 'Mage' },
                        gameState: { location: 'Enchanted Forest', health: 85 }
                    }
                });

            expect(response.status).toBe(200);
            
            // Verify the service was called with the context
            const callArgs = mockMIFFService.proxyChatCompletion.mock.calls[0][0];
            expect(callArgs.context).toBeDefined();
            expect(callArgs.context.currentQuest).toBe('Find the lost artifact');
            expect(callArgs.context.playerCharacter.name).toBe('Aria');
        });

        it('should return 400 when messages array is missing', async () => {
            const response = await request(app)
                .post('/api/miff/llm/chat')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('missing_field');
            expect(response.body.message).toContain('messages');
        });

        it('should return 400 when messages array is empty', async () => {
            const response = await request(app)
                .post('/api/miff/llm/chat')
                .send({
                    messages: []
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('invalid_field');
            expect(response.body.message).toContain('cannot be empty');
        });

        it('should return 400 when message format is invalid', async () => {
            const response = await request(app)
                .post('/api/miff/llm/chat')
                .send({
                    messages: [
                        { role: 'user' } // missing content
                    ]
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('invalid_field');
            expect(response.body.message).toContain('role and content');
        });

        it('should return 400 when message role is invalid', async () => {
            const response = await request(app)
                .post('/api/miff/llm/chat')
                .send({
                    messages: [
                        { role: 'invalid_role', content: 'Hello' }
                    ]
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('invalid_field');
            expect(response.body.message).toContain('system, user, or assistant');
        });

        it('should return 429 when rate limit is exceeded', async () => {
            mockMIFFService.proxyChatCompletion.mockRejectedValue(new Error('Rate limit exceeded. Please try again later.'));

            const response = await request(app)
                .post('/api/miff/llm/chat')
                .send({
                    messages: [
                        { role: 'user', content: 'Hello' }
                    ]
                });

            expect(response.status).toBe(429);
            expect(response.body.error).toBe('rate_limit_exceeded');
            expect(response.body.retry_after).toBeDefined();
        });

        it('should return 408 when request times out', async () => {
            mockMIFFService.proxyChatCompletion.mockRejectedValue(new Error('Request timeout'));

            const response = await request(app)
                .post('/api/miff/llm/chat')
                .send({
                    messages: [
                        { role: 'user', content: 'Hello' }
                    ]
                });

            expect(response.status).toBe(408);
            expect(response.body.error).toBe('request_timeout');
            expect(response.body.processing_time_ms).toBeDefined();
        });

        it('should return 500 for unexpected errors', async () => {
            mockMIFFService.proxyChatCompletion.mockRejectedValue(new Error('Unexpected error'));

            const response = await request(app)
                .post('/api/miff/llm/chat')
                .send({
                    messages: [
                        { role: 'user', content: 'Hello' }
                    ]
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('internal_server_error');
            expect(response.body.processing_time_ms).toBeDefined();
        });

        it('should handle optional parameters correctly', async () => {
            mockMIFFService.proxyChatCompletion.mockResolvedValue({
                choices: [{
                    message: {
                        role: 'assistant',
                        content: 'Response with custom parameters'
                    },
                    finish_reason: 'stop'
                }],
                usage: {
                    prompt_tokens: 15,
                    completion_tokens: 10,
                    total_tokens: 25
                },
                model: 'test-model'
            });

            const response = await request(app)
                .post('/api/miff/llm/chat')
                .send({
                    messages: [
                        { role: 'user', content: 'Hello' }
                    ],
                    max_tokens: 500,
                    temperature: 0.5
                });

            expect(response.status).toBe(200);
            
            // Verify parameters were passed through
            const callArgs = mockMIFFService.proxyChatCompletion.mock.calls[0][0];
            expect(callArgs.max_tokens).toBe(500);
            expect(callArgs.temperature).toBe(0.5);
        });
    });

    describe('GET /api/miff/llm/status', () => {
        it('should return service status', async () => {
            const response = await request(app)
                .get('/api/miff/llm/status');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('ok');
            expect(response.body.configured).toBe(true);
            expect(response.body.provider).toBe('together');
            expect(response.body.model).toBe('test-model');
            expect(response.body.rate_limit).toBeDefined();
            expect(response.body.timestamp).toBeDefined();
        });

        it('should handle service errors gracefully', async () => {
            mockServices.get.mockImplementation(() => {
                throw new Error('Service unavailable');
            });

            const response = await request(app)
                .get('/api/miff/llm/status');

            expect(response.status).toBe(500);
            expect(response.body.status).toBe('error');
            expect(response.body.message).toBeDefined();
        });
    });

    describe('POST /api/miff/llm/test', () => {
        it('should run test successfully', async () => {
            mockMIFFService.proxyChatCompletion.mockResolvedValue({
                choices: [{
                    message: {
                        role: 'assistant',
                        content: 'Test response'
                    },
                    finish_reason: 'stop'
                }],
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 5,
                    total_tokens: 15
                },
                model: 'test-model'
            });

            const response = await request(app)
                .post('/api/miff/llm/test');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.configured).toBe(true);
            expect(response.body.response).toBeDefined();
            expect(response.body.timestamp).toBeDefined();
        });

        it('should handle test failures', async () => {
            mockMIFFService.proxyChatCompletion.mockRejectedValue(new Error('API error'));

            const response = await request(app)
                .post('/api/miff/llm/test');

            expect(response.status).toBe(500);
            expect(response.body.status).toBe('error');
            expect(response.body.message).toBeDefined();
            expect(response.body.timestamp).toBeDefined();
        });
    });

    describe('Mock Response Fallback', () => {
        it('should work with mock responses when not configured', async () => {
            mockMIFFService.isConfigured.mockReturnValue(false);
            mockMIFFService.proxyChatCompletion.mockResolvedValue({
                choices: [{
                    message: {
                        role: 'assistant',
                        content: 'As you venture through the mystical realm...'
                    },
                    finish_reason: 'stop'
                }],
                usage: {
                    prompt_tokens: 50,
                    completion_tokens: 30,
                    total_tokens: 80
                },
                model: 'mock-model',
                mock: true
            });

            const response = await request(app)
                .post('/api/miff/llm/chat')
                .send({
                    messages: [
                        { role: 'user', content: 'Tell me about my quest' }
                    ]
                });

            expect(response.status).toBe(200);
            expect(response.body.mock).toBe(true);
            expect(response.body.choices[0].message.content).toContain('mystical realm');
        });
    });

    describe('Complex MIFF Context Scenarios', () => {
        it('should handle complex game state context', async () => {
            const complexContext = {
                currentQuest: 'Retrieve the Crystal of Eternal Light',
                activeDialogue: 'Speaking with the Oracle of Shadows',
                playerCharacter: {
                    name: 'Zara Nightwind',
                    class: 'Shadowmage',
                    level: 12,
                    abilities: ['Shadow Step', 'Dark Vision', 'Void Bolt'],
                    inventory: ['Health Potion', 'Mystic Scroll', 'Ancient Key']
                },
                gameState: {
                    location: 'Temple of the Forgotten',
                    health: 78,
                    mana: 45,
                    experience: 2450,
                    questProgress: {
                        'Retrieve the Crystal of Eternal Light': 0.6,
                        'Speak with the Oracle': 1.0
                    },
                    worldState: {
                        timeOfDay: 'dusk',
                        weather: 'foggy',
                        moonPhase: 'waning'
                    }
                }
            };

            mockMIFFService.proxyChatCompletion.mockResolvedValue({
                choices: [{
                    message: {
                        role: 'assistant',
                        content: 'The Oracle speaks in riddles: "When shadows dance and light fades, seek the crystal where moonlight never reaches..."'
                    },
                    finish_reason: 'stop'
                }],
                usage: {
                    prompt_tokens: 150,
                    completion_tokens: 35,
                    total_tokens: 185
                },
                model: 'test-model'
            });

            const response = await request(app)
                .post('/api/miff/llm/chat')
                .send({
                    messages: [
                        { role: 'user', content: 'What does the Oracle say about the crystal?' }
                    ],
                    context: complexContext
                });

            expect(response.status).toBe(200);
            
            const callArgs = mockMIFFService.proxyChatCompletion.mock.calls[0][0];
            expect(callArgs.context).toEqual(complexContext);
            expect(response.body.choices[0].message.content).toContain('Oracle');
        });

        it('should handle dialogue context with multiple NPCs', async () => {
            const dialogueContext = {
                activeDialogue: 'Council meeting in the Great Hall',
                npcsPresent: [
                    { name: 'King Aldric', role: 'Monarch', mood: 'concerned' },
                    { name: 'General Valerius', role: 'Military Commander', mood: 'strategic' },
                    { name: 'Elder Morwen', role: 'Wisdom Keeper', mood: 'mysterious' }
                ],
                conversationHistory: [
                    { speaker: 'King Aldric', message: 'The darkness spreads faster than we anticipated.' },
                    { speaker: 'General Valerius', message: 'Our forces are stretched thin defending the borders.' },
                    { speaker: 'Elder Morwen', message: 'The prophecy speaks of a chosen one who will wield the Crystal of Light.' }
                ],
                playerCharacter: {
                    name: 'Lyra Starweaver',
                    reputation: 'Respected Hero',
                    relationship: {
                        'King Aldric': 85,
                        'General Valerius': 70,
                        'Elder Morwen': 90
                    }
                }
            };

            mockMIFFService.proxyChatCompletion.mockResolvedValue({
                choices: [{
                    message: {
                        role: 'assistant',
                        content: 'As you enter the Great Hall, all eyes turn to you. King Aldric speaks: "Lyra, we need your expertise now more than ever."'
                    },
                    finish_reason: 'stop'
                }],
                usage: {
                    prompt_tokens: 120,
                    completion_tokens: 40,
                    total_tokens: 160
                },
                model: 'test-model'
            });

            const response = await request(app)
                .post('/api/miff/llm/chat')
                .send({
                    messages: [
                        { role: 'user', content: 'I enter the council chamber. What happens?' }
                    ],
                    context: dialogueContext
                });

            expect(response.status).toBe(200);
            expect(response.body.choices[0].message.content).toContain('King Aldric');
        });
    });
});