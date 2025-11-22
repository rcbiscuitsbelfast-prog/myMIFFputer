# Content Directory Structure Example

This directory demonstrates the contract for MIFF desktop content packs.

## Structure

```
content/
├── apps/           # Application definitions and manifests
├── themes/         # UI themes, CSS, and styling assets
├── templates/      # HTML page templates and layouts
├── assets/         # Static assets (images, icons, fonts)
├── locales/        # Internationalization files (i18n)
└── config/         # Configuration files and settings
```

## Integration Methods

### 1. Direct Copy
```bash
cp -r path/to/content-pack/* content/
```

### 2. Git Submodule
```bash
git submodule add https://github.com/your-org/content-pack.git content
git submodule update --init --recursive
```

### 3. NPM Package
```bash
npm install @your-org/content-pack
```

## Usage in MIFF Desktop

```javascript
// Load content configuration
import config from '../content/config/app.json';

// Load theme
import '../content/themes/default.css';

// Load locale
import locale from '../content/locales/en.json';
```

## Content Pack Development

When creating content packs for MIFF desktop:

1. Follow the standard directory structure
2. Provide a `config/manifest.json` with metadata
3. Include fallback assets and locales
4. Document any special requirements
5. Version your content pack semantically

## Example Manifest

```json
{
  "name": "My Content Pack",
  "version": "1.0.0",
  "description": "A sample content pack for MIFF desktop",
  "author": "Your Name",
  "license": "MIT",
  "compatibility": {
    "miff-version": ">=1.0.0"
  },
  "features": [
    "custom-themes",
    "additional-locales",
    "custom-apps"
  ]
}
```