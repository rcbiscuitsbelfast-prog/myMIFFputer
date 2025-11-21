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

const MIFFLLMProxyService = require('./MIFFLLMProxyService.js');

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('MIFFLLMProxyService', () => {
    let service;
    let mockServices;

    beforeEach(() => {
        // Mock environment variables
        process.env.MIFF_LLM_PROVIDER = 'together';
        process.env.MIFF_LLM_MODEL = 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo';
        process.env.MIFF_LLM_API_KEY = 'test-key';
        process.env.MIFF_LLM_TIMEOUT = '30000';
        process.env.MIFF_LLM_RATE_LIMIT_WINDOW = '60000';
        process.env.MIFF_LLM_RATE_LIMIT_MAX = '10';

        mockServices = {
            get: vi.fn()
        };

        service = new MIFFLLMProxyService();
        service.services = mockServices;
        service._init();
        
        // Reset fetch mock
        mockFetch.mockClear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        delete process.env.MIFF_LLM_PROVIDER;
        delete process.env.MIFF_LLM_MODEL;
        delete process.env.MIFF_LLM_API_KEY;
        delete process.env.MIFF_LLM_TIMEOUT;
        delete process.env.MIFF_LLM_RATE_LIMIT_WINDOW;
        delete process.env.MIFF_LLM_RATE_LIMIT_MAX;
    });

    describe('isConfigured', () => {
        it('should return true when all required environment variables are set', () => {
            expect(service.isConfigured()).toBe(true);
        });

        it('should return false when provider is missing', () => {
            delete process.env.MIFF_LLM_PROVIDER;
            service._init();
            expect(service.isConfigured()).toBe(false);
        });

        it('should return false when API key is missing', () => {
            delete process.env.MIFF_LLM_API_KEY;
            service._init();
            expect(service.isConfigured()).toBe(false);
        });

        it('should return false when model is missing', () => {
            delete process.env.MIFF_LLM_MODEL;
            service._init();
            expect(service.isConfigured()).toBe(false);
        });
    });

    describe('checkRateLimit', () => {
        it('should allow first request', () => {
            expect(service.checkRateLimit('test-client')).toBe(true);
        });

        it('should allow requests within limit', () => {
            for (let i = 0; i < 5; i++) {
                expect(service.checkRateLimit('test-client')).toBe(true);
            }
        });

        it('should block requests exceeding limit', () => {
            // Fill up the rate limit
            for (let i = 0; i < 10; i++) {
                service.checkRateLimit('test-client');
            }
            // Next request should be blocked
            expect(service.checkRateLimit('test-client')).toBe(false);
        });

        it('should reset rate limit after window expires', async () => {
            // Fill up the rate limit
            for (let i = 0; i < 10; i++) {
                service.checkRateLimit('test-client');
            }
            
            // Should be blocked
            expect(service.checkRateLimit('test-client')).toBe(false);
            
            // Wait for window to expire (shorter timeout for testing)
            service.rateLimitWindow = 10;
            await new Promise(resolve => setTimeout(resolve, 20));
            
            // Should be allowed again
            expect(service.checkRateLimit('test-client')).toBe(true);
        });
    });

    describe('injectMIFFContext', () => {
        it('should return messages unchanged when no context provided', () => {
            const messages = [{ role: 'user', content: 'Hello' }];
            const result = service.injectMIFFContext(messages, null);
            expect(result).toEqual(messages);
        });

        it('should add system message when context provided', () => {
            const messages = [{ role: 'user', content: 'Hello' }];
            const context = {
                currentQuest: 'Find the lost artifact',
                activeDialogue: 'Talking to wizard'
            };
            
            const result = service.injectMIFFContext(messages, context);
            
            expect(result).toHaveLength(2);
            expect(result[0].role).toBe('system');
            expect(result[0].content).toContain('Find the lost artifact');
            expect(result[0].content).toContain('Talking to wizard');
        });

        it('should append to existing system message', () => {
            const messages = [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'Hello' }
            ];
            const context = {
                currentQuest: 'Find the lost artifact'
            };
            
            const result = service.injectMIFFContext(messages, context);
            
            expect(result).toHaveLength(2);
            expect(result[0].role).toBe('system');
            expect(result[0].content).toContain('You are a helpful assistant.');
            expect(result[0].content).toContain('Find the lost artifact');
        });
    });

    describe('buildMIFFSystemPrompt', () => {
        it('should build prompt with all context fields', () => {
            const context = {
                currentQuest: 'Find the lost artifact',
                activeDialogue: 'Talking to wizard',
                playerCharacter: { name: 'Hero', level: 5 },
                gameState: { location: 'forest', health: 100 }
            };
            
            const prompt = service.buildMIFFSystemPrompt(context);
            
            expect(prompt).toContain('MIFF (Mystical Interactive Fantasy Framework)');
            expect(prompt).toContain('Find the lost artifact');
            expect(prompt).toContain('Talking to wizard');
            expect(prompt).toContain('Hero');
            expect(prompt).toContain('forest');
        });

        it('should build minimal prompt with no context', () => {
            const prompt = service.buildMIFFSystemPrompt({});
            
            expect(prompt).toContain('MIFF (Mystical Interactive Fantasy Framework)');
            expect(prompt).toContain('Respond in character');
        });
    });

    describe('createMockResponse', () => {
        it('should create mock response with expected structure', () => {
            const messages = [{ role: 'user', content: 'Hello' }];
            const response = service.createMockResponse(messages);
            
            expect(response.choices).toBeDefined();
            expect(response.choices).toHaveLength(1);
            expect(response.choices[0].message).toBeDefined();
            expect(response.choices[0].message.role).toBe('assistant');
            expect(typeof response.choices[0].message.content).toBe('string');
            expect(response.usage).toBeDefined();
            expect(response.model).toBeDefined();
            expect(response.mock).toBe(true);
        });
    });

    describe('generateMockResponse', () => {
        it('should return quest-related response for quest keywords', () => {
            const response = service.generateMockResponse('Tell me about my quest');
            expect(response).toContain('venture through the mystical realm');
        });

        it('should return forest-related response for forest keywords', () => {
            const response = service.generateMockResponse('I see a forest ahead');
            expect(response).toContain('ancient trees');
        });

        it('should return help-related response for help keywords', () => {
            const response = service.generateMockResponse('Can you help me?');
            expect(response).toContain('mysterious figure');
        });

        it('should return magic-related response for magic keywords', () => {
            const response = service.generateMockResponse('Cast a spell');
            expect(response).toContain('magical energy');
        });

        it('should return default response for no keywords', () => {
            const response = service.generateMockResponse('Random message');
            expect(response).toContain('quest continues');
        });
    });

    describe('proxyChatCompletion', () => {
        it('should return mock response when not configured', async () => {
            delete process.env.MIFF_LLM_API_KEY;
            service._init();
            
            const request = {
                messages: [{ role: 'user', content: 'Hello' }],
                context: null
            };
            
            const response = await service.proxyChatCompletion(request, 'test-client');
            
            expect(response.mock).toBe(true);
            expect(response.choices).toBeDefined();
        });

        it('should inject context into messages', async () => {
            const context = { currentQuest: 'Test quest' };
            const request = {
                messages: [{ role: 'user', content: 'Hello' }],
                context: context
            };
            
            // Mock successful API response
            mockFetch.mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    choices: [{ message: { role: 'assistant', content: 'Response' } }],
                    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
                    model: 'test-model'
                })
            });
            
            await service.proxyChatCompletion(request, 'test-client');
            
            // Verify fetch was called with injected context
            expect(mockFetch).toHaveBeenCalled();
            const callArgs = mockFetch.mock.calls[0][1];
            const requestBody = JSON.parse(callArgs.body);
            
            // Should have system message with context
            const systemMessage = requestBody.messages.find(msg => msg.role === 'system');
            expect(systemMessage).toBeDefined();
            expect(systemMessage.content).toContain('Test quest');
        });

        it('should respect rate limiting', async () => {
            // Fill up rate limit
            for (let i = 0; i < 10; i++) {
                service.checkRateLimit('test-client');
            }
            
            const request = {
                messages: [{ role: 'user', content: 'Hello' }],
                context: null
            };
            
            await expect(service.proxyChatCompletion(request, 'test-client'))
                .rejects.toThrow('Rate limit exceeded');
        });

        it('should handle API errors gracefully', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            });
            
            const request = {
                messages: [{ role: 'user', content: 'Hello' }],
                context: null
            };
            
            const response = await service.proxyChatCompletion(request, 'test-client');
            
            // Should fall back to mock response
            expect(response.mock).toBe(true);
        });

        it('should handle timeout errors', async () => {
            mockFetch.mockRejectedValue(new Error('Request timeout'));
            
            const request = {
                messages: [{ role: 'user', content: 'Hello' }],
                context: null
            };
            
            const response = await service.proxyChatCompletion(request, 'test-client');
            
            // Should fall back to mock response
            expect(response.mock).toBe(true);
        });
    });

    describe('makeProviderRequest', () => {
        it('should call Together AI provider', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    choices: [{ message: { role: 'assistant', content: 'Response' } }],
                    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
                    model: 'test-model'
                })
            });
            
            const messages = [{ role: 'user', content: 'Hello' }];
            const originalRequest = { max_tokens: 100, temperature: 0.7 };
            
            const response = await service.makeTogetherRequest(messages, originalRequest);
            
            expect(mockFetch).toHaveBeenCalled();
            const callArgs = mockFetch.mock.calls[0];
            expect(callArgs[0]).toBe('https://api.together.xyz/v1/chat/completions');
            
            const headers = callArgs[1].headers;
            expect(headers.Authorization).toBe('Bearer test-key');
            expect(headers['Content-Type']).toBe('application/json');
            
            const body = JSON.parse(callArgs[1].body);
            expect(body.model).toBe('meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo');
            expect(body.messages).toEqual(messages);
            expect(body.max_tokens).toBe(100);
            expect(body.temperature).toBe(0.7);
        });

        it('should call HuggingFace provider', async () => {
            // Change provider to HuggingFace
            process.env.MIFF_LLM_PROVIDER = 'huggingface';
            service._init();
            
            mockFetch.mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue([{
                    generated_text: 'HuggingFace response'
                }])
            });
            
            const messages = [
                { role: 'system', content: 'System' },
                { role: 'user', content: 'Hello' }
            ];
            const originalRequest = { max_tokens: 100, temperature: 0.7 };
            
            const response = await service.makeHuggingFaceRequest(messages, originalRequest);
            
            expect(mockFetch).toHaveBeenCalled();
            const callArgs = mockFetch.mock.calls[0];
            expect(callArgs[0]).toContain('api-inference.huggingface.co/models');
            
            const headers = callArgs[1].headers;
            expect(headers.Authorization).toBe('Bearer test-key');
            
            const body = JSON.parse(callArgs[1].body);
            expect(body.inputs).toContain('system: System');
            expect(body.inputs).toContain('user: Hello');
            expect(body.parameters.max_new_tokens).toBe(100);
            expect(body.parameters.temperature).toBe(0.7);
        });

        it('should throw error for unsupported provider', async () => {
            process.env.MIFF_LLM_PROVIDER = 'unsupported';
            service._init();
            
            const messages = [{ role: 'user', content: 'Hello' }];
            const originalRequest = {};
            
            await expect(service.makeProviderRequest(messages, originalRequest))
                .rejects.toThrow('Unsupported provider');
        });
    });
});