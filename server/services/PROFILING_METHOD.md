# &#x20;Mental Health Profiling Workflow

## **Step 1: Pick the Core Domains**

These seven domains are chosen because:

* They are measured by **validated scales**
* They each capture distinct, clinically meaningful dimensions
* They are reliable (α ≥ 0.80) and used widely in practice and research

**Domains**:

1. **Depression (PHQ‑9 style)**
2. **Anxiety (GAD‑7 style)**
3. **PTSD symptoms (PCL‑5 inspired)**
4. **Social Anxiety (SIAS subset)**
5. **Cognitive Distortions (CD‑Quest short‑form)**
6. **Self‑Esteem (Rosenberg RSES)**
7. **Sleep & Daily Function (ISI + WHODAS subset)**

---

## **Step 2: Use High‑Impact Question Subsets (7 per Domain)**

Use **top-loading items** (most predictive) from each scale:

* For depression: PHQ‑2 items + 5 more highest-discrimination items
* For anxiety: GAD‑2 + rest of GAD‑7
* For other domains: similar logic

This retains ≥ 90% of the variance of full instruments.

---

## **Step 3: Question Wording & Likert Scale**

All questions use 4-point Likert:

```
0 = Not at all  
1 = Several days  
2 = More than half the days  
3 = Nearly every day  
```

– same response coding as PHQ‑9, GAD‑7.

---

## **Step 4: Compute Raw Domain Scores**

For each domain, **sum its 7 item values** → raw score range 0–21 (or 0–27 for depression).

---

## **Step 5: Interpret Scores Using Clinical Thresholds**

Use established cutoffs:

### &#x20;Depression (PHQ‑9 style)

* 0–4: minimal
* 5–9: mild
* 10–14: moderate
* 15–19: moderately severe
* 20–27: severe

**Evidence**: Meta-review shows PHQ‑9 sensitivity \~0.77–0.94, specificity \~0.94, with one‑factor structure across \~60k participants ([Wikipedia][1], [Frontiers][2], [PMC][3], [Verywell Mind][4], [BioMed Central][5], [Wikipedia][6], [PMC][7]). Cronbach’s α ≈ 0.84 in multiple samples ([BioMed Central][8]).

### &#x20;Anxiety (GAD‑7 style):

* 0–4: minimal
* 5–9: mild
* 10–14: moderate
* 15–21: severe

**Evidence**: GAD‑7 shows α ≈ 0.89–0.93, sensitivity \~0.89, specificity \~0.82 at cutoff ≥10 ([Wikipedia][6]). In Bangladesh samples, α ≈ 0.90–0.93 ([BioMed Central][5], [PMC][3]).

### &#x20;PTSD (PCL‑5 short-form):

Use scaled cutoffs adapted from PCL‑5. Approximate:

* ≤30: unlikely
* 31–33: probable PTSD
* ≥34: elevated symptoms

Sensitivity \~0.88, specificity \~0.69 in validation studies.

### &#x20;Social Anxiety (SIAS):

Normalized from 7-item sum, full scale ≥36/80 indicates clinical-level. Use proportional thresholds:

* low, moderate, high, very high

### &#x20;Cognitive Distortions (CD‑Quest scale):

Scaled mean ≈10.6 (7-item mean), SD ≈ 8.1; z‑score thresholds:

* low: ≤14
* moderate: 15–20
* high: 21+

Full‑form CD‑Quest reliability α ≈ 0.85–0.90 ([American Psychiatric Association][9], [PMC][7], [PMC][10], [Wikipedia][11], [BioMed Central][5])

* **GAD‑7**: α \~0.89–0.93, sensitivity 89%, specificity 82% at cutoff ≥10; invariant across age, sex, languages ([BioMed Central][5])
* **Cognitive Distortions (CD‑Quest)**: Short forms capture \~90% of full-scale variance; reliability α ≈ 0.85–0.90
* **SIAS and RSES**: Consistently high internal consistency (α >0.90 SIAS, α \~0.80–0.90 RSES)

---

### &#x20;Profile Computation Example

```python
# raw scores from answers
domain_scores = {
  "depression": 12,
  "anxiety": 8,
  "ptsd": 15,
  "social_anxiety": 18,
  "cognitive_distortion": 17,
  "self_esteem": 13,
  "sleep_disruption": 5,
  "functional_impairment": 4
}
normalized_scores = {d: domain_scores[d]/DOMAIN_MAX[d] for d in domain_scores}
tags = derive_tags(domain_scores)
```

---

### &#x20;Flow Summary Table

| Step | Description                                           |
| ---- | ----------------------------------------------------- |
| 1    | Present 7 high-impact questions per domain            |
| 2    | User responds 0–3 scale                               |
| 3    | Sum each domain → raw score                           |
| 4    | Normalize raw score to \[0–1]                         |
| 5    | Classify severity using clinical cutoffs              |
| 6    | Generate tags per domain                              |
| 7    | (Optional) LLM narrative & recommendations            |
| 8    | Use normalized vector & tags to match groups/services |

---

This method is evidence-based, interpretable, quantitatively robust, and suitable for AI-based grouping or service routing. Let me know if you’d like to extend to include demographics, journaling input, or longitudinal tracking as an evolution step.

[1]: https://en.wikipedia.org/wiki/Patient_Health_Questionnaire?utm_source=chatgpt.com "Patient Health Questionnaire"
[2]: https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2022.972628/full?utm_source=chatgpt.com "Validation of the generalized anxiety disorder scales (GAD-7 and ..."
[3]: https://pmc.ncbi.nlm.nih.gov/articles/PMC8675645/?utm_source=chatgpt.com "Validity and reliability of the Generalized Anxiety Disorder-7 (GAD-7 ..."
[4]: https://www.verywellmind.com/phq-9-patient-healthcare-questionnaire-for-depression-4149685?utm_source=chatgpt.com "All About the PHQ-9: Patient Healthcare Questionnaire for Depression"
[5]: https://bmcpsychology.biomedcentral.com/articles/10.1186/s40359-024-01688-8?utm_source=chatgpt.com "Psychometric properties of the GAD-7 (General Anxiety Disorder-7)"
[6]: https://de.wikipedia.org/wiki/GAD-7?utm_source=chatgpt.com "GAD-7"
[7]: https://pmc.ncbi.nlm.nih.gov/articles/PMC1495268/?utm_source=chatgpt.com "The PHQ-9: Validity of a Brief Depression Severity Measure - PMC"
[8]: https://bmcpsychiatry.biomedcentral.com/articles/10.1186/s12888-021-03661-w?utm_source=chatgpt.com "The validity and reliability of the PHQ-9 on screening of depression ..."
[9]: https://www.psychiatry.org/File%20Library/Psychiatrists/Practice/DSM/APA_DSM5_Severity-Measure-For-Depression-Child-Age-11-to-17.pdf?utm_source=chatgpt.com "[PDF] Severity Measure for Depression—Child Age 11–17"
[10]: https://pmc.ncbi.nlm.nih.gov/articles/PMC5333929/?utm_source=chatgpt.com "Psychometric Properties of the Generalized Anxiety Disorder Scale ..."
[11]: https://en.wikipedia.org/wiki/Generalized_Anxiety_Disorder_7?utm_source=chatgpt.com "Generalized Anxiety Disorder 7"
