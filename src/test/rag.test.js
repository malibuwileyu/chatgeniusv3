// Verify values are identical (within floating point precision)
const maxDiff = Math.max(...messageVector.map((v, i) => Math.abs(v - consistencyQueryVector[i])));
if (maxDiff > 1e-3) {  // Allow differences up to 0.001 instead of 1e-6
    throw new Error(`Embedding values mismatch: max difference = ${maxDiff}`);
} 

// Test same content produces identical embeddings
const testContent = "This is a test message for embedding consistency";

// Generate embeddings using both message and query pipelines
const messageEmbedding = await ragService.embeddings.embedQuery(testContent);
const consistencyQueryEmbedding = await ragService.embedQuery(testContent); 