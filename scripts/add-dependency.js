#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get root package name
const rootPackageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
const rootPackageName = rootPackageJson.name;

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error(`Usage: pnpm add-dependency source-package -> target-package`);
  process.exit(1);
}

const [sourceTarget] = args;
const [source, target] = sourceTarget.split('->').map(s => s.trim());

if (!source || !target) {
  console.error('Invalid format. Use: source-package -> target-package');
  process.exit(1);
}

// Extract package names and paths
const sourceParts = source.split('/');
const targetParts = target.split('/');

// Validate package names match root package name
if (!source.startsWith(`@${rootPackageName}/`) || !target.startsWith(`@${rootPackageName}/`)) {
  console.error(`Error: Both packages must belong to the ${rootPackageName} monorepo.`);
  console.error('For external dependencies, use: pnpm install <package>');
  process.exit(1);
}

const sourcePackage = sourceParts[1]; // Skip the @ai-agent part
const sourceSubpackage = sourceParts[2];
const targetPackage = targetParts[1]; // Skip the @ai-agent part
const targetSubpackage = targetParts[2];

// Helper function to read and parse JSON file
function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    process.exit(1);
  }
}

// Helper function to write JSON file
function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    process.exit(1);
  }
}

// Helper function to check if a path exists
function pathExists(filePath) {
  return fs.existsSync(filePath);
}

// Helper function to get package directory
function getPackageDir(packageName, subpackage) {
  return path.join(process.cwd(), 'packages', packageName, 'packages', subpackage);
}

// Main function to add dependency
function addDependency() {
  const sourceDir = getPackageDir(sourcePackage, sourceSubpackage);
  const targetDir = getPackageDir(targetPackage, targetSubpackage);

  // Check if directories exist
  if (!pathExists(sourceDir)) {
    console.error(`Source package directory not found: ${sourceDir}`);
    process.exit(1);
  }

  if (!pathExists(targetDir)) {
    console.error(`Target package directory not found: ${targetDir}`);
    process.exit(1);
  }

  // Read package.json and tsconfig.json files
  const sourcePackageJson = readJsonFile(path.join(sourceDir, 'package.json'));
  const sourceTsConfig = readJsonFile(path.join(sourceDir, 'tsconfig.json'));
  const targetTsConfig = readJsonFile(path.join(targetDir, 'tsconfig.json'));

  // Check if target package is composite
  if (!targetTsConfig.compilerOptions?.composite) {
    console.error(`Target package ${target} must have composite: true in tsconfig.json`);
    process.exit(1);
  }

  // Update package.json dependencies
  const dependencyName = `@${rootPackageName}/${targetPackage}/${targetSubpackage}`;
  if (!sourcePackageJson.dependencies) {
    sourcePackageJson.dependencies = {};
  }
  sourcePackageJson.dependencies[dependencyName] = 'workspace:*';

  // Update tsconfig.json references
  if (!sourceTsConfig.references) {
    sourceTsConfig.references = [];
  }

  const referencePath = path.relative(sourceDir, targetDir);
  const referenceExists = sourceTsConfig.references.some(
    ref => ref.path === referencePath
  );

  if (!referenceExists) {
    sourceTsConfig.references.push({ path: referencePath });
  }

  // Update tsconfig.json paths
  if (!sourceTsConfig.compilerOptions.paths) {
    sourceTsConfig.compilerOptions.paths = {};
  }

  const pathKey = `@${rootPackageName}/${targetPackage}/${targetSubpackage}`;
  const pathValue = [path.join(referencePath, 'src')];
  sourceTsConfig.compilerOptions.paths[pathKey] = pathValue;

  // Write updated files
  writeJsonFile(path.join(sourceDir, 'package.json'), sourcePackageJson);
  writeJsonFile(path.join(sourceDir, 'tsconfig.json'), sourceTsConfig);

  console.log(`Successfully added dependency from ${source} to ${target}`);
  console.log('Updated files:');
  console.log(`- ${path.join(sourceDir, 'package.json')}`);
  console.log(`- ${path.join(sourceDir, 'tsconfig.json')}`);
}

// Run the script
addDependency(); 