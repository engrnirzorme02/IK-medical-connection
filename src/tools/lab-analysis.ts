export interface LabTestInput {
  test_name: string;
  value: number;
  unit: string;
}

export interface LabTestEvaluation {
  test_name: string;
  patient_value: number;
  unit: string;
  reference_range: string;
  status: "NORMAL" | "HIGH" | "LOW" | "CRITICAL_HIGH" | "CRITICAL_LOW";
  clinical_observation: string;
}

const REFERENCE_RANGES: Record<string, { min: number; max: number; unit: string; critical_min?: number; critical_max?: number }> = {
  hemoglobin: { min: 13.5, max: 17.5, unit: "g/dL", critical_min: 7.0, critical_max: 20.0 },
  platelets: { min: 150000, max: 450000, unit: "/mcL", critical_min: 50000, critical_max: 1000000 },
  creatinine: { min: 0.7, max: 1.3, unit: "mg/dL", critical_max: 4.0 },
  fasting_glucose: { min: 70, max: 100, unit: "mg/dL", critical_min: 40, critical_max: 400 },
  hba1c: { min: 4.0, max: 5.6, unit: "%", critical_max: 10.0 },
  wbc: { min: 4500, max: 11000, unit: "/mcL", critical_min: 2000, critical_max: 30000 },
  alt: { min: 7, max: 56, unit: "U/L" },
  ast: { min: 10, max: 40, unit: "U/L" }
};

export function analyzeLabReport(tests: LabTestInput[]): LabTestEvaluation[] {
  return tests.map((t) => {
    const key = t.test_name.toLowerCase().replace(/[\s-_]/g, "");
    const matchedKey = Object.keys(REFERENCE_RANGES).find(k => key.includes(k) || k.includes(key));
    const ref = matchedKey ? REFERENCE_RANGES[matchedKey] : null;

    if (!ref) {
      return {
        test_name: t.test_name,
        patient_value: t.value,
        unit: t.unit,
        reference_range: "Standard range lookup required",
        status: "NORMAL",
        clinical_observation: "Reference range not in local cache; verify clinical laboratory sheet."
      };
    }

    let status: LabTestEvaluation["status"] = "NORMAL";
    let observation = "Within expected physiological limits.";

    if (ref.critical_max && t.value >= ref.critical_max) {
      status = "CRITICAL_HIGH";
      observation = "Dangerously elevated. Immediate clinical correlation required.";
    } else if (ref.critical_min && t.value <= ref.critical_min) {
      status = "CRITICAL_LOW";
      observation = "Critically low. Urgent clinical attention recommended.";
    } else if (t.value > ref.max) {
      status = "HIGH";
      observation = "Above upper limit of normal range.";
    } else if (t.value < ref.min) {
      status = "LOW";
      observation = "Below lower limit of normal range.";
    }

    return {
      test_name: t.test_name,
      patient_value: t.value,
      unit: t.unit,
      reference_range: `${ref.min} - ${ref.max} ${ref.unit}`,
      status,
      clinical_observation: observation
    };
  });
}
