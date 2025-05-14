#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

const VOWEL_PATTERN = /(?<!^)[aeiou](?!([A-Z]|$))/g;

function shortenKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'object' && item !== null) {
        return shortenKeys(item);
      }
      return item;
    });
  }
  
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const result = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const camelCased = key.replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => {
      return index === 0 ? letter.toLowerCase() : letter.toUpperCase();
    }).replace(/\s+/g, '');
    
    const shortenedKey = camelCased.replace(VOWEL_PATTERN, '').replace(/[^a-zA-Z0-9]/g, '');
    
    if (typeof value === 'object' && value !== null) {
      result[shortenedKey] = shortenKeys(value);
    } else {
      result[shortenedKey] = value;
    }
  }
  
  return result;
}

async function processFile(inputPath, outputPath) {
  try {
    console.log(`Reading from: ${inputPath}`);
    const data = await fs.readJson(inputPath);
    
    console.log('Shortening keys...');
    const processedData = shortenKeys(data);
    
    console.log(`Writing to: ${outputPath}`);
    await fs.writeJson(outputPath, processedData, { spaces: 2 });
    
    console.log('Done! Keys have been shortened successfully.');
  } catch (error) {
    console.error('Error processing file:', error.message);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Error: Please provide an input file path.');
    console.log('Usage: node shortenKeys.js <inputFilePath> [outputPath]');
    process.exit(1);
  }
  
  const inputPath = path.resolve(args[0]);
  let outputPath;
  
  if (!await fs.pathExists(inputPath)) {
    console.error(`Error: Input file '${inputPath}' does not exist.`);
    process.exit(1);
  }
  
  const inputStats = await fs.stat(inputPath);
  if (!inputStats.isFile()) {
    console.error(`Error: '${inputPath}' is not a file.`);
    process.exit(1);
  }
  
  if (args.length >= 2) {
    const specifiedOutput = path.resolve(args[1]);
    
    if (await fs.pathExists(specifiedOutput)) {
      const outputStats = await fs.stat(specifiedOutput);
      if (outputStats.isDirectory()) {
        const inputFileName = path.basename(inputPath);
        outputPath = path.join(specifiedOutput, inputFileName);
      } else {
        outputPath = specifiedOutput;
      }
    } else {
      outputPath = specifiedOutput;
    }
  } else {
    const inputDir = path.dirname(inputPath);
    const inputFileName = path.basename(inputPath, path.extname(inputPath));
    const inputExt = path.extname(inputPath);
    outputPath = path.join(inputDir, `${inputFileName}_shortened${inputExt}`);
  }
  
  await processFile(inputPath, outputPath);
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
