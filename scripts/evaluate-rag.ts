import {
  retrieveRelevantChunks,
  type RetrievalResult,
} from "../src/lib/agents/rag/vector/retrieval";
import type { LocalMemoryContext } from "../src/lib/types/chat";

type SupportedCase = {
  name: string;
  question: string;
  expectedSourcePaths: string[];
  localMemoryContext?: LocalMemoryContext;
};

const supportedCases: SupportedCase[] = [
  {
    name: "CMG overview",
    question: "what is CMG?",
    expectedSourcePaths: ["local-memory/projects/clinmatchgo/brief.md"],
  },
  {
    name: "CMG MatchRite dependency",
    question: "what is the MatchRite dependency for CMG?",
    expectedSourcePaths: ["local-memory/contracts/clinmatchgo/brief.md"],
  },
  {
    name: "CRTMS overview",
    question: "what is CRTMS?",
    expectedSourcePaths: ["local-memory/projects/crtms/brief.md"],
  },
  {
    name: "CRTMS contract scope",
    question: "what is in scope for the CRTMS contract?",
    expectedSourcePaths: ["local-memory/contracts/crtms/brief.md"],
  },
  {
    name: "SCRITI hours",
    question: "how many hours did we estimate for SCRITI?",
    expectedSourcePaths: ["local-memory/contracts/scriti/brief.md"],
  },
  {
    name: "SCRITI teaching boundary",
    question: "am I supposed to teach SCRITI?",
    expectedSourcePaths: ["local-memory/contracts/scriti/brief.md"],
  },
  {
    name: "follow-up contract",
    question: "tell me about that contract",
    expectedSourcePaths: ["local-memory/contracts/scriti/brief.md"],
    localMemoryContext: {
      lastSourcePaths: ["local-memory/contracts/scriti/brief.md"],
      lastCategories: ["contracts"],
    },
  },
  {
    name: "Wayfair resume",
    question: "what did I do at Wayfair?",
    expectedSourcePaths: ["local-memory/personal-notes/resume/master-resume.md"],
  },
  {
    name: "Next.js route handlers",
    question: "what does Next.js say about route handlers?",
    expectedSourcePaths: [
      "local-memory/technologies/nextjs/getting-started/route-handlers.md",
      "local-memory/technologies/nextjs/api-reference/file-conventions/route.md",
    ],
  },
];

async function main() {
  const failures: string[] = [];

  for (const testCase of supportedCases) {
    const result = await retrieveRelevantChunks(testCase.question, {
      localMemoryContext: testCase.localMemoryContext,
    });
    const sourcePaths = result.sources.map((source) => source.sourcePath);
    const matchedExpectedPath = testCase.expectedSourcePaths.some((expectedPath) =>
      sourcePaths.includes(expectedPath)
    );

    if (!matchedExpectedPath) {
      failures.push(
        `${testCase.name}: expected one of ${testCase.expectedSourcePaths.join(", ")}, got ${
          sourcePaths.join(", ") || "no sources"
        }`
      );
    }

    printCase(testCase.name, testCase.question, result);
  }

  if (failures.length > 0) {
    console.error("\nRAG evaluation failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }

  console.log("\nRAG evaluation passed.");
}

function printCase(name: string, question: string, result: RetrievalResult) {
  console.log(`\n[${name}] ${question}`);

  if (result.sources.length === 0) {
    console.log("  no sources");
    return;
  }

  result.sources.forEach((source, index) => {
    console.log(`  ${index + 1}. ${source.sourcePath} (${source.score.toFixed(3)})`);
  });
}

void main();
