import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { fetchDrugSafetyProfile } from "./tools/openfda.js";
import { checkDrugInteractions } from "./tools/rxnorm.js";
import { analyzeLabReport, LabTestInput } from "./tools/lab-analysis.js";

const server = new Server(
  {
    name: "ik-medical-connection",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_drug_safety_profile",
        description: "Fetches official openFDA drug adverse events, boxed warnings, and side effects.",
        inputSchema: {
          type: "object",
          properties: {
            drug_name: { type: "string", description: "Generic or brand name of the medicine" }
          },
          required: ["drug_name"]
        }
      },
      {
        name: "check_drug_interaction",
        description: "Checks drug-drug interaction using RxNorm identifiers and openFDA official labels.",
        inputSchema: {
          type: "object",
          properties: {
            drug_names: {
              type: "array",
              items: { type: "string" },
              description: "Array of medicine names to evaluate"
            }
          },
          required: ["drug_names"]
        }
      },
      {
        name: "analyze_lab_report",
        description: "Evaluates patient laboratory results against standard clinical reference ranges.",
        inputSchema: {
          type: "object",
          properties: {
            tests: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  test_name: { type: "string" },
                  value: { type: "number" },
                  unit: { type: "string" }
                },
                required: ["test_name", "value", "unit"]
              }
            }
          },
          required: ["tests"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "get_drug_safety_profile") {
    const drugName = String(args?.drug_name || "");
    const result = await fetchDrugSafetyProfile(drugName);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }

  if (name === "check_drug_interaction") {
    const drugNames = (args?.drug_names as string[]) || [];
    const result = await checkDrugInteractions(drugNames);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }

  if (name === "analyze_lab_report") {
    const tests = (args?.tests as LabTestInput[]) || [];
    const result = analyzeLabReport(tests);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP server fatal error:", err);
  process.exit(1);
});
