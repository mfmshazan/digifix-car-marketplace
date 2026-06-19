
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to database.');
    
    console.log('Altering Product table...');
    await client.query('ALTER TABLE "Product" ALTER COLUMN "categoryId" DROP NOT NULL;');
    console.log('Successfully made categoryId optional in Product table.');
    
  } catch (error) {
    console.error('Migration failed:');
    console.error(error);
  } finally {
    await client.end();
  }
}

main();
