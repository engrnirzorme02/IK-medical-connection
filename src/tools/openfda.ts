export interface DrugSafetyResult {
  drug: string;
  boxed_warning: string[];
  warnings_and_precautions: string[];
  adverse_reactions_label: string[];
  top_reported_adverse_events: { reaction: string; reported_count: number }[];
  drug_interactions_label?: string[];
}

export async function fetchDrugSafetyProfile(drugName: string): Promise<DrugSafetyResult | { error: string }> {
  try {
    const encoded = encodeURIComponent(drugName.trim());
    const labelUrl = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encoded}"+openfda.brand_name:"${encoded}"&limit=1`;
    const eventUrl = `https://api.fda.gov/drug/event.json?search=patient.drug.openfda.generic_name:"${encoded}"&count=patient.reaction.reactionmeddrapt.exact&limit=10`;

    const [labelRes, eventRes] = await Promise.all([
      fetch(labelUrl),
      fetch(eventUrl)
    ]);

    const labelData = labelRes.ok ? await labelRes.json() : null;
    const eventData = eventRes.ok ? await eventRes.json() : null;

    const label = labelData?.results?.[0] || {};
    const topReactions = (eventData?.results || []).map((r: { term: string; count: number }) => ({
      reaction: r.term,
      reported_count: r.count
    }));

    return {
      drug: drugName,
      boxed_warning: label.boxed_warning || ["No black box warning found."],
      warnings_and_precautions: label.warnings_and_cautions || label.warnings || ["None specified in label."],
      adverse_reactions_label: label.adverse_reactions || ["Refer to prescribing information."],
      top_reported_adverse_events: topReactions,
      drug_interactions_label: label.drug_interactions || []
    };
  } catch (error) {
    return { error: `Failed to fetch openFDA drug safety data: ${(error as Error).message}` };
  }
}
