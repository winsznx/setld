import { runLoop } from './loop.js';
runLoop()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
