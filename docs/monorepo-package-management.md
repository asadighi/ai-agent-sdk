# Monorepo Package Management

This document describes how to manage packages and subpackages in the AI Agent SDK monorepo.

## Package Structure

The monorepo uses a nested package structure:

```
packages/
  └── package-name/
      ├── packages/
      │   ├── types/         # Type definitions
      │   ├── tests/         # Tests
      │   └── subpackage/    # Additional subpackages
      ├── package.json       # Package root configuration
      └── tsconfig.json      # TypeScript root configuration
```

## Creating New Packages

To create a new package with the standard structure (types and tests subpackages):

```bash
pnpm create-package <package-name>
```

For example:
```bash
pnpm create-package analytics
```

This will create:
- `packages/analytics/` root package
- `packages/analytics/packages/types` for type definitions
- `packages/analytics/packages/tests` for tests
- All necessary configuration files

## Creating New Subpackages

To add a new subpackage to an existing package:

```bash
pnpm create-subpackage <package-name> <subpackage-name>
```

For example:
```bash
pnpm create-subpackage connectivity web
```

This will create:
- `packages/connectivity/packages/web/` subpackage
- Proper TypeScript configuration with project references
- Package.json with correct dependencies
- Initial source files

## Managing Dependencies

### Adding Dependencies Between Subpackages

To add a dependency between subpackages within the monorepo:

```bash
pnpm add-dependency <source-package> -> <target-package>
```

For example:
```bash
# Adding dependency within the same package
pnpm add-dependency @ai-agent/connectivity/common -> @ai-agent/connectivity/types

# Adding dependency across packages
pnpm add-dependency @ai-agent/connectivity/common -> @ai-agent/multi-logger/types
```

This will:
- Add the dependency to package.json
- Update tsconfig.json with proper project references
- Configure path mappings for clean imports
- Validate that both packages belong to the monorepo

Note: For external dependencies, use the standard `pnpm install` command.

## Package Configuration

### TypeScript Project References

All packages use TypeScript project references for proper build ordering and type checking. The build command `tsc --build` is used to ensure correct dependency resolution.

Each subpackage's `tsconfig.json` includes:
- Reference to the types package
- Proper path mappings for type imports
- Composite project settings

### Package Dependencies

Subpackages automatically include:
- Reference to their parent package's types (`@ai-agent/package-name/types`)
- Workspace dependencies using `workspace:*`
- Common dev dependencies (TypeScript, testing tools)

## Building Packages

To build a specific package and its subpackages:

```bash
# Build entire package
pnpm --filter @ai-agent/package-name build

# Build specific subpackage
pnpm --filter @ai-agent/package-name/subpackage-name build
```

## Testing Packages

To run tests for a package:

```bash
# Run all tests in a package
pnpm --filter @ai-agent/package-name test

# Run tests for specific subpackage
pnpm --filter @ai-agent/package-name/subpackage-name test
```

## Best Practices

1. **Types First**: Always define types in the `types` subpackage before implementing features.
2. **Project References**: Use `tsc --build` instead of `tsc` for proper project reference handling.
3. **Dependency Management**: Use `workspace:*` for internal dependencies to ensure version consistency.
4. **Testing**: Keep tests in the `tests` subpackage or alongside the implementation if specific to a subpackage.
5. **Dependencies**: Use `pnpm add-dependency` for adding dependencies between subpackages within the monorepo.

## Examples

### Creating a New Feature Package

```bash
# Create the main package
pnpm create-package feature-name

# Add implementation subpackages
pnpm create-subpackage feature-name web
pnpm create-subpackage feature-name node

# Add dependencies
pnpm add-dependency @ai-agent/feature-name/web -> @ai-agent/feature-name/types
pnpm add-dependency @ai-agent/feature-name/node -> @ai-agent/feature-name/types

# Build the entire feature
pnpm --filter @ai-agent/feature-name build
```

### Adding to Existing Package

```bash
# Add new subpackage to existing package
pnpm create-subpackage connectivity firebase

# Add dependencies
pnpm add-dependency @ai-agent/connectivity/firebase -> @ai-agent/connectivity/types
pnpm add-dependency @ai-agent/connectivity/firebase -> @ai-agent/multi-logger/types

# Build just the new subpackage
pnpm --filter @ai-agent/connectivity/firebase build
``` 