/**
 * Generate embeddings for all graph nodes
 * Run: npm run generate-embeddings
 */

import { EmbeddingsService } from '../src/lib/project-graph/embeddings';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables:');
  console.error('- VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function main() {
  console.log('🚀 Starting embeddings generation...\n');

  const service = new EmbeddingsService(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const count = await service.generateMissingEmbeddings(50); // Batch size of 50
    
    console.log(`\n✅ Successfully generated ${count} embeddings`);
  } catch (error) {
    console.error('\n❌ Error generating embeddings:', error);
    process.exit(1);
  }
}

main();
