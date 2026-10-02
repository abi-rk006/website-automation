#!/usr/bin/env node
/**
 * CLI Tool for TNSKILL Task Parser (Phase 2).
 * Usage:
 *   npm run parse-task -- <path-to-task-file>
 *   npm run parse-task -- "Raw instruction string"
 */
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { TaskParser } from '../parser/task-parser.js';
import { OllamaProvider } from '../llm/ollama.js';
import { loadConfig } from '../config/config.js';
import { logger } from '../logging/logger.js';

async function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const config = loadConfig();
  logger.setLevel(config.logLevel);

  const args = process.argv.slice(2);
  let input = args.join(' ').trim();

  if (!input) {
    input = await promptUser('Enter path to task instruction file (or raw instruction): ');
  }

  if (!input) {
    console.error('No input provided. Exiting.');
    process.exit(1);
  }

  let rawInstruction = input;
  // Check if input is a valid file path
  const resolvedPath = path.resolve(process.cwd(), input);
  if (fs.existsSync(resolvedPath)) {
    try {
      rawInstruction = fs.readFileSync(resolvedPath, 'utf-8');
      logger.info(`Loaded task instruction from file: ${resolvedPath}`);
    } catch (err: any) {
      console.error(`Failed to read file ${resolvedPath}:`, err.message);
      process.exit(1);
    }
  }

  const ollama = new OllamaProvider({
    baseUrl: config.ollamaBaseUrl,
    model: config.ollamaModel,
    timeoutMs: 30000,
  });

  const parser = new TaskParser(ollama);
  const result = await parser.parse(rawInstruction);

  console.log('\n' + result.formattedOutput + '\n');

  if (result.validation.requiresClarification || !result.validation.valid) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error in parse-task CLI:', err);
  process.exit(1);
});
