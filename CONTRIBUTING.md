# Contributing to Terminal Deck

Thank you for your interest in contributing to Terminal Deck! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:

1. A clear, descriptive title
2. Steps to reproduce the issue
3. Expected behavior vs actual behavior
4. Your environment (OS, Node.js version, etc.)
5. Screenshots if applicable

### Suggesting Features

Feature requests are welcome! Please open an issue with:

1. A clear description of the feature
2. Why this feature would be useful
3. Any implementation ideas you have

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Install dependencies**: `npm install`
3. **Make your changes** following the code style guidelines
4. **Test your changes**: Run `npm run dev` to test locally
5. **Lint your code**: Run `npm run lint`
6. **Format your code**: Run `npm run format`
7. **Commit your changes** with a clear commit message
8. **Push to your fork** and open a Pull Request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/Terminal-Deck.git
cd Terminal-Deck

# Install dependencies
npm install

# Start development server
npm run dev
```

## Code Style

- Use TypeScript for all new code
- Follow the existing code patterns
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### Commit Messages

- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove, etc.)
- Keep the first line under 72 characters

Examples:
- `Add terminal search functionality`
- `Fix group switching keyboard shortcut`
- `Update README with new screenshots`

## Project Structure

```
terminal-deck/
├── electron/           # Main process code
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom hooks
│   ├── stores/         # Zustand stores
│   ├── types/          # TypeScript types
│   └── utils/          # Utilities
└── assets/             # Static assets
```

## Testing

Currently, the project doesn't have automated tests. Contributions to add testing are especially welcome!

When testing manually:
1. Test on your platform (Windows/macOS/Linux)
2. Test terminal creation and deletion
3. Test group management
4. Test keyboard shortcuts
5. Test drag and drop functionality

## Questions?

Feel free to open an issue if you have any questions about contributing.

Thank you for contributing!
