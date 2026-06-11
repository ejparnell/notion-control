import { loadIngestionConfig } from "../src/lib/agents/rag/vector/config";
import { runDocumentIngestion } from "../src/lib/agents/rag/vector/pipeline";

async function main() {
  const config = loadIngestionConfig();
  const summary = await runDocumentIngestion(config);

  console.log(`Ingested ${summary.documents} local-memory document(s) into ${summary.chunks} chunk(s).`);
  console.log(`Vector index written to ${summary.indexPath}.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Local-memory ingestion failed.";
  console.error(message);
  process.exitCode = 1;
});
