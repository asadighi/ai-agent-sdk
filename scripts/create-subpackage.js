#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get command line arguments
const packageName = process.argv[2];
const subpackageName = process.argv[3];

if (!packageName || !subpackageName) {
  console.error('Please provide both package name and subpackage name');
  console.error('Usage: node create-subpackage.js <package-name> <subpackage-name>');
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const packageDir = path.join(rootDir, 'packages', packageName);
const subpackageDir = path.join(packageDir, 'packages', subpackageName);

// Validate that the package exists
if (!fs.existsSync(packageDir)) {
  console.error(`Package ${packageName} does not exist`);
  process.exit(1);
}

// Validate that the subpackage doesn't exist
if (fs.existsSync(subpackageDir)) {
  console.error(`Subpackage ${subpackageName} already exists in ${packageName}`);
  process.exit(1);
}

// Create directory structure
fs.mkdirSync(subpackageDir, { recursive: true });
fs.mkdirSync(path.join(subpackageDir, 'src'), { recursive: true });

// Create package.json
const packageJson = {
  name: `@ai-agent/${packageName}/${subpackageName}`,
  version: "0.1.0",
  private: true,
  description: `${subpackageName} module for ${packageName}`,
  main: "dist/index.js",
  types: "dist/index.d.ts",
  scripts: {
    "build": "tsc --build",
    "test": "vitest run",
    "test:watch": "vitest",
    "clean": "rimraf dist"
  },
  dependencies: {
    [`@ai-agent/${packageName}/types`]: "workspace:*"
  },
  devDependencies: {
    "@types/node": "^20.11.19",
    "typescript": "^5.3.3",
    "vitest": "^1.2.2",
    "rimraf": "^5.0.5"
  }
};

fs.writeFileSync(
  path.join(subpackageDir, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);

// Create tsconfig.json
const tsConfig = {
  extends: "../../tsconfig.json",
  compilerOptions: {
    outDir: "dist",
    rootDir: "src",
    module: "ESNext",
    target: "ES2020",
    declaration: true,
    sourceMap: true,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    composite: true,
    incremental: true,
    baseUrl: ".",
    paths: {
      [`@ai-agent/${packageName}/types`]: ["../types/src"]
    }
  },
  include: ["src/**/*"],
  exclude: ["node_modules", "dist", "**/*.test.ts"],
  references: [
    { path: "../types" }
  ]
};

fs.writeFileSync(
  path.join(subpackageDir, 'tsconfig.json'),
  JSON.stringify(tsConfig, null, 2)
);

// Create initial source file and test file
fs.mkdirSync(path.join(subpackageDir, 'src', '__tests__'), { recursive: true });

fs.writeFileSync(
  path.join(subpackageDir, 'src', 'index.ts'),
  `// Add your ${subpackageName} implementation here\n`
);

fs.writeFileSync(
  path.join(subpackageDir, 'src', '__tests__', 'index.test.ts'),
  `import { describe, it, expect } from 'vitest';

describe('${packageName} ${subpackageName}', () => {
    it('should have ${subpackageName} implementation defined', () => {
        expect(true).toBe(true);
    });
});\n`
);

// Update root package's package.json to include the new subpackage in workspaces
const rootPackageJsonPath = path.join(packageDir, 'package.json');
const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));

if (!rootPackageJson.workspaces.includes(`packages/${subpackageName}`)) {
  rootPackageJson.workspaces.push(`packages/${subpackageName}`);
  fs.writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2));
}

// Update root package's tsconfig.json to include the new subpackage in references
const rootTsConfigPath = path.join(packageDir, 'tsconfig.json');
const rootTsConfig = JSON.parse(fs.readFileSync(rootTsConfigPath, 'utf8'));

if (!rootTsConfig.references) {
  rootTsConfig.references = [];
}

const subpackageRef = { path: `./packages/${subpackageName}` };
if (!rootTsConfig.references.some(ref => ref.path === subpackageRef.path)) {
  rootTsConfig.references.push(subpackageRef);
  fs.writeFileSync(rootTsConfigPath, JSON.stringify(rootTsConfig, null, 2));
}

console.log(`Successfully created subpackage ${subpackageName} in ${packageName}`);
console.log(`You can now start adding your implementation in ${subpackageDir}/src/index.ts`); 