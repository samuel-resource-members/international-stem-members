import { DatabaseSync } from 'node:sqlite';
import { getMigrations } from 'better-auth/db/migration';
import { writeFileSync } from 'node:fs';
const db = new DatabaseSync(':memory:');
const migration = await getMigrations({database:db,emailAndPassword:{enabled:true},rateLimit:{enabled:true,storage:'database'}});
writeFileSync('migrations/0001-auth.sql',await migration.compileMigrations());
db.close();
