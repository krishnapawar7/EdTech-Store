const fs = require('fs');
const path = require('path');

const target = process.argv[2];
if (target !== 'postgres' && target !== 'sqlite') {
  console.error('Usage: node scripts/switch-db.js [postgres|sqlite]');
  process.exit(1);
}

const sourceFile = target === 'postgres' 
  ? path.join(__dirname, '../prisma/schema.postgresql.prisma')
  : path.join(__dirname, '../prisma/schema.sqlite.prisma');

const destFile = path.join(__dirname, '../prisma/schema.prisma');

fs.copyFileSync(sourceFile, destFile);
console.log(`Switched Prisma schema to ${target.toUpperCase()}`);
