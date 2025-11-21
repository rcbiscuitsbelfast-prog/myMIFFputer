# MIFF Content Directory

This directory contains modular content for the MIFF (Make It For Free) ecosystem. The content is organized into the following subdirectories:

## Directory Structure

### `quests/`
Quest definitions with objectives and rewards. Each quest file should follow the Quest interface defined in `SCHEMA.ts`.

**Example**:
```json
{
  "slug": "tutorial-quest",
  "title": "Tutorial Quest",
  "description": "Learn the basics",
  "objectives": [
    {
      "id": "objective-1",
      "description": "Complete task 1"
    }
  ],
  "rewards": {
    "experience": 100,
    "items": []
  }
}
```

### `dialogue/`
NPC dialogue and conversation flows. Each dialogue file should follow the Dialogue interface defined in `SCHEMA.ts`.

**Example**:
```json
{
  "slug": "merchant-greeting",
  "npc": "merchant-bob",
  "lines": [
    {
      "id": "line-1",
      "speaker": "player",
      "text": "Hello!"
    },
    {
      "id": "line-2",
      "speaker": "merchant-bob",
      "text": "Welcome to my shop!"
    }
  ]
}
```

### `npcs/`
Non-player character definitions. Each NPC file should follow the NPC interface defined in `SCHEMA.ts`.

**Example**:
```json
{
  "slug": "merchant-bob",
  "name": "Merchant Bob",
  "description": "A friendly merchant",
  "role": "merchant",
  "location": "town-center",
  "attributes": {
    "friendliness": 8,
    "trustworthiness": 7
  }
}
```

### `items/`
Item definitions including equipment, consumables, and other interactive objects. Each item file should follow the Item interface defined in `SCHEMA.ts`.

**Example**:
```json
{
  "slug": "health-potion",
  "name": "Health Potion",
  "type": "consumable",
  "description": "Restores health when consumed",
  "value": 50,
  "effects": {
    "health_restore": 30
  }
}
```

## Schema Files

Each directory contains a `SCHEMA.ts` file that documents the expected structure of content files. These are TypeScript interface definitions that serve as documentation for the JSON structure.

## API Access

Content is accessible via the following API endpoints:

- `GET /api/miff/content` - Get all content organized by type
- `GET /api/miff/content/:type` - Get all content of a specific type (quests, dialogue, npcs, items)
- `GET /api/miff/content/:type/:slug` - Get a specific content item by type and slug

## Hot Reload

The MIFF Content Service watches the content directory for changes. Any changes to JSON files are automatically detected and reloaded, allowing for hot-reload during development.

## Environment Variables

- `MIFF_CONTENT_DIR` - Override the default content directory location. If not set, defaults to the `content/` directory in the project root.
