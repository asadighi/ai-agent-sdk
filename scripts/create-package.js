#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const packageName = process.argv[2];
if (!packageName) {
  console.error('Please provide a package name');
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const packageDir = path.join(rootDir, 'packages', packageName);
const packagesDir = path.join(packageDir, 'packages');

// Create directory structure
fs.mkdirSync(packageDir, { recursive: true });
fs.mkdirSync(packagesDir, { recursive: true });
fs.mkdirSync(path.join(packagesDir, 'types'), { recursive: true });
fs.mkdirSync(path.join(packagesDir, 'tests'), { recursive: true });
fs.mkdirSync(path.join(packagesDir, 'types', 'src'), { recursive: true });
fs.mkdirSync(path.join(packagesDir, 'tests', 'src'), { recursive: true });

// Create package's root package.json
const packageRootPackageJson = {
  name: `@ai-agent/${packageName}`,
  version: "0.1.0",
  private: true,
  description: `${packageName} modules for AI Agent`,
  workspaces: [
    "packages/*",
    "packages/types",
    "packages/tests"
  ],
  scripts: {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "clean": "pnpm -r clean"
  }
};

fs.writeFileSync(
  path.join(packageDir, 'package.json'),
  JSON.stringify(packageRootPackageJson, null, 2)
);

// Update root package.json with new scripts
const rootPackageJsonPath = path.join(rootDir, 'package.json');
const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));

// Add new build and test scripts
rootPackageJson.scripts[`build:${packageName}`] = `pnpm --filter @ai-agent/${packageName}/types build && pnpm --filter @ai-agent/${packageName}/tests build`;
rootPackageJson.scripts[`test:${packageName}`] = `pnpm --filter @ai-agent/${packageName}/types test && pnpm --filter @ai-agent/${packageName}/tests test`;

fs.writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2));

// Create root tsconfig.json
const rootTsConfig = {
  compilerOptions: {
    target: "ES2020",
    module: "ESNext",
    moduleResolution: "node",
    declaration: true,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    composite: true,
    incremental: true
  },
  exclude: ["node_modules", "dist"]
};

fs.writeFileSync(
  path.join(packageDir, 'tsconfig.json'),
  JSON.stringify(rootTsConfig, null, 2)
);

// Create types package.json
const typesPackageJson = {
  name: `@ai-agent/${packageName}/types`,
  version: "0.1.0",
  private: true,
  main: "dist/index.js",
  types: "dist/index.d.ts",
  scripts: {
    "build": "tsc",
    "test": "vitest",
    "clean": "rimraf dist"
  },
  devDependencies: {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0",
    "rimraf": "^5.0.0"
  }
};

fs.writeFileSync(
  path.join(packagesDir, 'types', 'package.json'),
  JSON.stringify(typesPackageJson, null, 2)
);

// Create types tsconfig.json
const typesTsConfig = {
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
    incremental: true
  },
  include: ["src/**/*"],
  exclude: ["node_modules", "dist", "**/*.test.ts"]
};

fs.writeFileSync(
  path.join(packagesDir, 'types', 'tsconfig.json'),
  JSON.stringify(typesTsConfig, null, 2)
);

// Create tests package.json
const testsPackageJson = {
  name: `@ai-agent/${packageName}/tests`,
  version: "0.1.0",
  private: true,
  main: "dist/index.js",
  types: "dist/index.d.ts",
  scripts: {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "clean": "rimraf dist"
  },
  dependencies: {
    [`@ai-agent/${packageName}/types`]: "workspace:*"
  },
  devDependencies: {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0",
    "rimraf": "^5.0.0"
  }
};

fs.writeFileSync(
  path.join(packagesDir, 'tests', 'package.json'),
  JSON.stringify(testsPackageJson, null, 2)
);

// Create tests tsconfig.json
const testsTsConfig = {
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
    incremental: true
  },
  include: ["src/**/*"],
  exclude: ["node_modules", "dist"]
};

fs.writeFileSync(
  path.join(packagesDir, 'tests', 'tsconfig.json'),
  JSON.stringify(testsTsConfig, null, 2)
);

// Create initial source files
fs.writeFileSync(
  path.join(packagesDir, 'types', 'src', 'index.ts'),
  '// Add your types here\n'
);

fs.writeFileSync(
  path.join(packagesDir, 'tests', 'src', 'index.ts'),
  '// Add your tests here\n'
);

// Update pnpm-workspace.yaml
const workspaceYamlPath = path.join(rootDir, 'pnpm-workspace.yaml');
const workspaceYaml = yaml.load(fs.readFileSync(workspaceYamlPath, 'utf8'));
const newPackagePath = `packages/${packageName}/packages/*`;

if (!workspaceYaml.packages.includes(newPackagePath)) {
  workspaceYaml.packages.push(newPackagePath);
  fs.writeFileSync(workspaceYamlPath, yaml.dump(workspaceYaml));
}

console.log(`Created new package ${packageName} with types and tests subpackages`);
console.log('Run `pnpm install` to install dependencies'); 