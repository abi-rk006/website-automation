#!/usr/bin/env node
/**
 * CLI Tool for TNSKILL Task Planner (Phase 3).
 * Usage:
 *   npm run plan-task -- <path-to-task-file>
 *   npm run plan-task -- "Raw instruction string"
 */
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { TaskParser } from '../parser/task-parser.js';
import { TaskPlanner } from '../planner/task-planner.js';
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
  let filename = 'Direct Input';
  const resolvedPath = path.resolve(process.cwd(), input);
  if (fs.existsSync(resolvedPath)) {
    try {
      rawInstruction = fs.readFileSync(resolvedPath, 'utf-8');
      filename = path.basename(resolvedPath);
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

  // 1. Phase 2: Parse Task
  logger.info('Executing Phase 2 Task Parser...');
  const parser = new TaskParser(ollama);
  const parseResult = await parser.parse(rawInstruction);

  if (!parseResult.validation.valid) {
    console.error('\nTask parsing failed validation. Cannot generate plan for invalid task.\n');
    console.error(parseResult.validation.summary);
    process.exit(1);
  }

  // 2. Phase 3: Plan Task
  logger.info('Executing Phase 3 Task Planner...');
  const planner = new TaskPlanner(ollama);
  const planResult = await planner.plan(parseResult.task);

  console.log(`\nInput File: ${filename}`);
  console.log('\n' + planResult.formattedOutput + '\n');

  if (!planResult.validation.valid) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error in plan-task CLI:', err);
  process.exit(1);
});
