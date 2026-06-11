import { pipeline } from "@huggingface/transformers";
import { DEFAULT_EMBEDDING_MODEL } from "./config";
import type { Embedder } from "./types";

type TensorLike = {
  tolist(): unknown;
};

export async function createLocalEmbedder(model = DEFAULT_EMBEDDING_MODEL): Promise<Embedder> {
  const extractor = await pipeline("feature-extraction", model);

  async function embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const output = (await extractor(texts, {
      pooling: "mean",
      normalize: true,
    })) as TensorLike;

    return normalizeEmbeddingOutput(output.tolist());
  }

  return {
    model,
    normalized: true,
    async embedDocuments(texts: string[]): Promise<number[][]> {
      return embedTexts(texts);
    },
    async embedQuery(text: string): Promise<number[]> {
      const [embedding] = await embedTexts([text]);

      if (!embedding) {
        throw new Error("Embedding model did not return a query embedding.");
      }

      return embedding;
    },
  };
}

export function normalizeEmbeddingOutput(value: unknown): number[][] {
  if (isNumberArray(value)) {
    return [value];
  }

  if (Array.isArray(value) && value.every(isNumberArray)) {
    return value;
  }

  throw new Error("Embedding model returned an unexpected tensor shape.");
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number" && Number.isFinite(item));
}
