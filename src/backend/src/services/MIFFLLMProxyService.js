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

const BaseService = require('./BaseService');
const { Context } = require('../util/context');
const config = require('../config');

/**
 * MIFFLLMProxyService provides a lightweight proxy for MIFF-specific LLM requests
 * Integrates with existing AI infrastructure while adding MIFF-specific metadata injection
 */
class MIFFLLMProxyService extends BaseService {
    /**
     * Initialize the MIFF LLM Proxy Service
     */
    async _init () {
        this.provider = process.env.MIFF_LLM_PROVIDER;
        this.model = process.env.MIFF_LLM_MODEL;
        this.apiKey = process.env.MIFF_LLM_API_KEY;
        this.timeout = parseInt(process.env.MIFF_LLM_TIMEOUT) || 30000;
        this.rateLimitWindow = parseInt(process.env.MIFF_LLM_RATE_LIMIT_WINDOW) || 60000;
        this.rateLimitMax = parseInt(process.env.MIFF_LLM_RATE_LIMIT_MAX) || 10;
        
        // Simple in-memory rate limiting
        this.rateLimitMap = new Map();
        
        // Clean up rate limit entries periodically
        setInterval(() => {
            const now = Date.now();
            for (const [key, data] of this.rateLimitMap.entries()) {
                if (now - data.resetTime > this.rateLimitWindow) {
                    this.rateLimitMap.delete(key);
                }
            }
        }, this.rateLimitWindow);
    }

    /**
     * Check if the service is properly configured
     * @returns {boolean} True if configured with valid API credentials
     */
    isConfigured() {
        return !!(this.provider && this.model && this.apiKey);
    }

    /**
     * Simple rate limiting check
     * @param {string} identifier - Client identifier (IP address or user ID)
     * @returns {boolean} True if request is allowed
     */
    checkRateLimit(identifier) {
        const now = Date.now();
        const key = identifier;
        
        if (!this.rateLimitMap.has(key)) {
            this.rateLimitMap.set(key, {
                count: 1,
                resetTime: now + this.rateLimitWindow
            });
            return true;
        }
        
        const data = this.rateLimitMap.get(key);
        
        if (now > data.resetTime) {
            data.count = 1;
            data.resetTime = now + this.rateLimitWindow;
            return true;
        }
        
        if (data.count >= this.rateLimitMax) {
            return false;
        }
        
        data.count++;
        return true;
    }

    /**
     * Inject MIFF-specific metadata into the conversation
     * @param {Array} messages - Conversation messages
     * @param {Object} context - MIFF context containing quests/dialogue metadata
     * @returns {Array} Modified messages with injected context
     */
    injectMIFFContext(messages, context) {
        if (!context || typeof context !== 'object') {
            return messages;
        }

        const systemMessage = {
            role: 'system',
            content: this.buildMIFFSystemPrompt(context)
        };

        // Insert system message at the beginning if it doesn't exist
        if (messages.length === 0 || messages[0].role !== 'system') {
            return [systemMessage, ...messages];
        }

        // Append to existing system message
        const existingSystem = messages[0];
        existingSystem.content += '\n\n' + systemMessage.content;
        
        return messages;
    }

    /**
     * Build MIFF-specific system prompt from context
     * @param {Object} context - MIFF context
     * @returns {string} System prompt content
     */
    buildMIFFSystemPrompt(context) {
        let prompt = 'You are assisting with a MIFF (Mystical Interactive Fantasy Framework) adventure. ';
        
        if (context.currentQuest) {
            prompt += `Current quest: ${context.currentQuest}. `;
        }
        
        if (context.activeDialogue) {
            prompt += `Active dialogue: ${context.activeDialogue}. `;
        }
        
        if (context.playerCharacter) {
            prompt += `Player character: ${JSON.stringify(context.playerCharacter)}. `;
        }
        
        if (context.gameState) {
            prompt += `Game state: ${JSON.stringify(context.gameState)}. `;
        }
        
        prompt += 'Respond in character and maintain the fantasy atmosphere.';
        
        return prompt;
    }

    /**
     * Create a mock response for when API keys are not configured
     * @param {Array} messages - Conversation messages
     * @returns {Object} Mock response
     */
    createMockResponse(messages) {
        const lastMessage = messages[messages.length - 1];
        const mockContent = this.generateMockResponse(lastMessage?.content || '');
        
        return {
            choices: [{
                message: {
                    role: 'assistant',
                    content: mockContent
                },
                finish_reason: 'stop'
            }],
            usage: {
                prompt_tokens: 50,
                completion_tokens: 30,
                total_tokens: 80
            },
            model: this.model || 'mock-model',
            mock: true
        };
    }

    /**
     * Generate a contextually appropriate mock response
     * @param {string} userMessage - The last user message
     * @returns {string} Mock response
     */
    generateMockResponse(userMessage) {
        const responses = [
            "As you venture through the mystical realm, you feel a sense of wonder and adventure.",
            "The ancient trees whisper secrets of forgotten times, guiding your path forward.",
            "A mysterious figure appears from the shadows, offering cryptic advice.",
            "The magical energy in the air crackles with possibility and danger.",
            "Your quest continues, with new challenges awaiting around every corner."
        ];
        
        // Simple keyword-based response selection
        const lowerMessage = userMessage.toLowerCase();
        if (lowerMessage.includes('quest') || lowerMessage.includes('adventure')) {
            return responses[0];
        } else if (lowerMessage.includes('forest') || lowerMessage.includes('tree')) {
            return responses[1];
        } else if (lowerMessage.includes('help') || lowerMessage.includes('guide')) {
            return responses[2];
        } else if (lowerMessage.includes('magic') || lowerMessage.includes('spell')) {
            return responses[3];
        } else {
            return responses[4];
        }
    }

    /**
     * Proxy chat completion request to configured LLM provider
     * @param {Object} request - Chat completion request
     * @param {string} identifier - Client identifier for rate limiting
     * @returns {Promise<Object>} Chat completion response
     */
    async proxyChatCompletion(request, identifier) {
        // Rate limiting check
        if (!this.checkRateLimit(identifier)) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }

        // Inject MIFF context if provided
        let messages = request.messages || [];
        if (request.context) {
            messages = this.injectMIFFContext(messages, request.context);
        }

        // Return mock response if not configured
        if (!this.isConfigured()) {
            return this.createMockResponse(messages);
        }

        try {
            return await this.forwardRequest(messages, request);
        } catch (error) {
            console.error('MIFF LLM Proxy Error:', error);
            
            // Fallback to mock response on API failure
            return this.createMockResponse(messages);
        }
    }

    /**
     * Forward request to the configured LLM provider
     * @param {Array} messages - Processed messages
     * @param {Object} originalRequest - Original request object
     * @returns {Promise<Object>} Provider response
     */
    async forwardRequest(messages, originalRequest) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), this.timeout);
        });

        const requestPromise = this.makeProviderRequest(messages, originalRequest);
        
        return Promise.race([requestPromise, timeoutPromise]);
    }

    /**
     * Make request to specific provider based on configuration
     * @param {Array} messages - Messages to send
     * @param {Object} originalRequest - Original request data
     * @returns {Promise<Object>} Provider response
     */
    async makeProviderRequest(messages, originalRequest) {
        const provider = this.provider.toLowerCase();
        
        switch (provider) {
            case 'together':
                return this.makeTogetherRequest(messages, originalRequest);
            case 'huggingface':
                return this.makeHuggingFaceRequest(messages, originalRequest);
            default:
                throw new Error(`Unsupported provider: ${this.provider}`);
        }
    }

    /**
     * Make request to Together AI
     * @param {Array} messages - Messages to send
     * @param {Object} originalRequest - Original request data
     * @returns {Promise<Object>} Together AI response
     */
    async makeTogetherRequest(messages, originalRequest) {
        const response = await fetch('https://api.together.xyz/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.model,
                messages: messages,
                max_tokens: originalRequest.max_tokens || 1000,
                temperature: originalRequest.temperature || 0.7,
                stream: false
            }),
            signal: AbortSignal.timeout(this.timeout)
        });

        if (!response.ok) {
            throw new Error(`Together AI API error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Make request to HuggingFace
     * @param {Array} messages - Messages to send
     * @param {Object} originalRequest - Original request data
     * @returns {Promise<Object>} HuggingFace response
     */
    async makeHuggingFaceRequest(messages, originalRequest) {
        // Convert messages to a single prompt for HuggingFace
        const prompt = messages.map(msg => 
            `${msg.role}: ${msg.content}`
        ).join('\n');

        const response = await fetch(`https://api-inference.huggingface.co/models/${this.model}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: originalRequest.max_tokens || 1000,
                    temperature: originalRequest.temperature || 0.7,
                    return_full_text: false
                }
            }),
            signal: AbortSignal.timeout(this.timeout)
        });

        if (!response.ok) {
            throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Convert HuggingFace response to OpenAI-compatible format
        return {
            choices: [{
                message: {
                    role: 'assistant',
                    content: data[0]?.generated_text || 'No response generated'
                },
                finish_reason: 'stop'
            }],
            usage: {
                prompt_tokens: prompt.length,
                completion_tokens: data[0]?.generated_text?.length || 0,
                total_tokens: prompt.length + (data[0]?.generated_text?.length || 0)
            },
            model: this.model
        };
    }
}

module.exports = MIFFLLMProxyService;