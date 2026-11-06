export interface DrugInteractionResult {
  status: string;
  checked_drugs: { name: string; rxcui?: string }[];
  interactions: Array<{ drug: string; interaction_text: string }>;
  message?: string;
}

export async function checkDrugInteractions(drugNames: string[]): Promise<DrugInteractionResult | { error: string }> {
  try {
    const normalized: { name: string; rxcui?: string }[] = [];
    const interactionFindings: Array<{ drug: string; interaction_text: string }> = [];

    for (const name of drugNames) {
      const trimmed = name.trim();
      const rxcuiRes = await fetch(`https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(trimmed)}`);
      let rxcui: string | undefined;
      if (rxcuiRes.ok) {
        const idData = await rxcuiRes.json();
        rxcui = idData.idGroup?.rxnormId?.[0];
      }
      normalized.push({ name: trimmed, rxcui });

      const labelRes = await fetch(`https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(trimmed)}"&limit=1`);
      if (labelRes.ok) {
        const labelJson = await labelRes.json();
        const interactions = labelJson.results?.[0]?.drug_interactions || [];
        if (interactions.length > 0) {
          interactionFindings.push({
            drug: trimmed,
            interaction_text: interactions.join(" ").substring(0, 800)
          });
        }
      }
    }

    return {
      status: "success",
      checked_drugs: normalized,
      interactions: interactionFindings,
      message: "Evaluated official openFDA prescribing interaction labels."
    };
  } catch (error) {
    return { error: `Failed to evaluate drug interactions: ${(error as Error).message}` };
  }
}
