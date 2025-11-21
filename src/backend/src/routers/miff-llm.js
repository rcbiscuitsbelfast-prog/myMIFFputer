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

const express = require('express');
const router = express.Router();
const { Context } = require('../util/context');
const APIError = require('../api/APIError');

/**
 * POST /api/miff/llm/chat
 * 
 * Proxy endpoint for MIFF LLM chat completions.
 * Accepts messages and optional context, forwards to configured LLM provider.
 * 
 * Request body:
 * {
 *   messages: Array<{role: string, content: string}>,
 *   context?: {
 *     currentQuest?: string,
 *     activeDialogue?: string,
 *     playerCharacter?: Object,
 *     gameState?: Object
 *   },
 *   max_tokens?: number,
 *   temperature?: number
 * }
 */
router.post('/api/miff/llm/chat', async (req, res) => {
    const startTime = Date.now();
    
    try {
        // Get client identifier for rate limiting
        const identifier = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        
        // Validate request body
        const { messages, context, max_tokens, temperature } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            throw APIError.create('missing_field', null, {
                field: 'messages',
                message: 'messages array is required'
            });
        }
        
        if (messages.length === 0) {
            throw APIError.create('invalid_field', null, {
                field: 'messages',
                message: 'messages array cannot be empty'
            });
        }
        
        // Validate message format
        for (const message of messages) {
            if (!message.role || !message.content) {
                throw APIError.create('invalid_field', null, {
                    field: 'messages',
                    message: 'each message must have role and content fields'
                });
            }
            
            if (!['system', 'user', 'assistant'].includes(message.role)) {
                throw APIError.create('invalid_field', null, {
                    field: 'messages',
                    message: 'message role must be system, user, or assistant'
                });
            }
        }
        
        // Get MIFF LLM Proxy service
        const miffLLMService = req.services.get('miff-llm-proxy');
        
        // Make the proxy request
        const response = await miffLLMService.proxyChatCompletion({
            messages,
            context,
            max_tokens,
            temperature
        }, identifier);
        
        // Add processing time metadata
        const processingTime = Date.now() - startTime;
        response.processing_time_ms = processingTime;
        
        // Log for debugging (in production, use proper logging)
        if (process.env.NODE_ENV !== 'production') {
            console.log(`MIFF LLM Proxy request processed in ${processingTime}ms`);
            console.log(`Provider configured: ${miffLLMService.isConfigured()}`);
            if (response.mock) {
                console.log('Returned mock response (API not configured)');
            }
        }
        
        res.json(response);
        
    } catch (error) {
        console.error('MIFF LLM Proxy Error:', error);
        
        // Handle API errors
        if (error instanceof APIError) {
            return res.status(error.get_http_status()).json(error.to_response_json());
        }
        
        // Handle rate limiting
        if (error.message.includes('Rate limit exceeded')) {
            return res.status(429).json({
                error: 'rate_limit_exceeded',
                message: 'Rate limit exceeded. Please try again later.',
                retry_after: 60
            });
        }
        
        // Handle timeout errors
        if (error.message.includes('timeout')) {
            return res.status(408).json({
                error: 'request_timeout',
                message: 'Request timed out. Please try again.',
                processing_time_ms: Date.now() - startTime
            });
        }
        
        // Generic error response
        res.status(500).json({
            error: 'internal_server_error',
            message: 'An error occurred while processing your request.',
            processing_time_ms: Date.now() - startTime
        });
    }
});

/**
 * GET /api/miff/llm/status
 * 
 * Health check endpoint for the MIFF LLM proxy service.
 * Returns configuration status and basic service information.
 */
router.get('/api/miff/llm/status', async (req, res) => {
    try {
        const miffLLMService = req.services.get('miff-llm-proxy');
        
        res.json({
            status: 'ok',
            configured: miffLLMService.isConfigured(),
            provider: miffLLMService.provider,
            model: miffLLMService.model,
            rate_limit: {
                window_ms: miffLLMService.rateLimitWindow,
                max_requests: miffLLMService.rateLimitMax
            },
            timeout_ms: miffLLMService.timeout,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('MIFF LLM Status Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Service unavailable'
        });
    }
});

/**
 * POST /api/miff/llm/test
 * 
 * Test endpoint for validating the LLM proxy configuration.
 * Sends a simple test message and returns the response.
 */
router.post('/api/miff/llm/test', async (req, res) => {
    try {
        const miffLLMService = req.services.get('miff-llm-proxy');
        
        // Simple test message
        const testMessages = [
            {
                role: 'user',
                content: 'Hello! This is a test message for the MIFF LLM proxy.'
            }
        ];
        
        const identifier = req.ip || req.headers['x-forwarded-for'] || 'test';
        
        const response = await miffLLMService.proxyChatCompletion({
            messages: testMessages,
            max_tokens: 50,
            temperature: 0.7
        }, identifier);
        
        res.json({
            status: 'success',
            configured: miffLLMService.isConfigured(),
            response: response,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('MIFF LLM Test Error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;