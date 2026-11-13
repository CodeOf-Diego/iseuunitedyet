// Builds the minified site and publishes dist/ to the gh-pages branch (served by GitHub Pages).
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const run = (cmd, cwd = '.') => execSync(cmd, { cwd, stdio: 'inherit' });
const remote = execSync('git remote get-url origin').toString().trim();

run('node build.mjs');
writeFileSync('dist/.nojekyll', '');           // serve files as they are, no Jekyll processing
run('git init -q -b gh-pages', 'dist');
run('git add -A', 'dist');
run(`git commit -q -m "Deploy ${new Date().toISOString()}"`, 'dist');
run(`git push -q -f ${remote} gh-pages`, 'dist');
console.log('Deployed to gh-pages');
