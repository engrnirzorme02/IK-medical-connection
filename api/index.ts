import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchDrugSafetyProfile } from "../src/tools/openfda.js";
import { checkDrugInteractions } from "../src/tools/rxnorm.js";
import { analyzeLabReport } from "../src/tools/lab-analysis.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    return res.status(200).json({
      status: "online",
      server: "ik-medical-connection",
      protocol: "Model Context Protocol (MCP)",
      tools: [
        "get_drug_safety_profile",
        "check_drug_interaction",
        "analyze_lab_report"
      ]
    });
  }

  if (req.method === "POST") {
    const { tool, args } = req.body || {};

    try {
      if (tool === "get_drug_safety_profile") {
        const result = await fetchDrugSafetyProfile(String(args?.drug_name || ""));
        return res.status(200).json(result);
      }

      if (tool === "check_drug_interaction") {
        const result = await checkDrugInteractions(args?.drug_names || []);
        return res.status(200).json(result);
      }

      if (tool === "analyze_lab_report") {
        const result = analyzeLabReport(args?.tests || []);
        return res.status(200).json(result);
      }

      return res.status(400).json({ error: `Unknown tool: ${tool}` });
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
