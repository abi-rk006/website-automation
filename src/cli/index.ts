import readline from 'readline';
import { BrowserAgent } from '../agent/agent.js';
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
  console.log('====================================================');
  console.log('   TNSKILL Autonomous Browser Agent — Phase 1 CLI   ');
  console.log('====================================================');

  const args = process.argv.slice(2);
  let task = args.join(' ').trim();

  if (!task) {
    task = await promptUser('\nEnter task: ');
  }

  if (!task) {
    console.log('No task entered. Exiting.');
    process.exit(0);
  }

  console.log(`\nExecuting task: "${task}"\n`);

  const agent = new BrowserAgent();

  // Handle Ctrl+C cleanly
  process.on('SIGINT', async () => {
    console.log('\nInterrupted by user. Shutting down cleanly...');
    await agent.shutdown();
    process.exit(0);
  });

  try {
    const result = await agent.execute(task);
    console.log('\n' + result.summary + '\n');
  } catch (err: any) {
    logger.error('Fatal agent error', err);
  } finally {
    await agent.shutdown();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error in CLI:', err);
  process.exit(1);
});
