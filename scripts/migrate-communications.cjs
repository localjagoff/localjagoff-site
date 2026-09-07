const {neon} = require('@neondatabase/serverless');
const statements = require('../lib/communications-schema.cjs');
(async()=>{
  if (process.env.COMMUNICATIONS_MIGRATION_ALLOWED!=='true' || !process.env.DATABASE_URL) throw new Error('migration_not_authorized');
  const sql=neon(process.env.DATABASE_URL);
  await sql.transaction(statements.map(statement=>sql.query(statement)),{fetchOptions:{signal:AbortSignal.timeout(30000)}});
  console.log('Communications schema migration complete. No customer data logged.');
})().catch(()=>{console.error('Communications migration failed; inspect the provider securely.');process.exitCode=1;});
