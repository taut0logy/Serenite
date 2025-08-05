from typing import Dict, Tuple, List
from groq import Groq
import instructor
import json
from models.mental_health_profile import MentalHealthProfile
from config.settings import settings

SYSTEM_MESSAGE = {
    "role": "system",
    "content": (
        "You are a mental‑health intake assistant. "
        "Your job is to interpret a user's mental health questionnaire scores across seven domains—"
        "depression (PHQ‑9 style), anxiety (GAD‑7 style), PTSD (PCL‑5 style), social anxiety (SIAS), "
        "cognitive distortions (CD‑Quest), self‑esteem (RSES), and sleep/function (ISI/WHODAS). "
        "You must output valid JSON matching the MentalHealthProfile schema."
    ),
}

USER_PROMPT = """
Here are the _domain_scores_ (integer totals of 7–9 question Likert items), _normalized_scores_ (0–1),
and associated _tags_, each tag in the form "<domain>_<severity>" such as "depression_moderate", etc.

Domain Definitions:
- depression: PHQ‑9-like total 0‑27. Cut-offs: ≥10 moderate (sens/spec ≈88%)  :contentReference[oaicite:6]{index=6}  
- anxiety: GAD‑7-style 0‑21. Cut-offs: ≥10 moderate anxiety (sens 89%, spec 82%)  :contentReference[oaicite:7]{index=7}  
- ptsd: PCL‑5 short-form scaled 0‑21. Cut-offs: ≥31 probable PTSD (sens ~88%)  :contentReference[oaicite:8]{index=8}  
- social_anxiety: scaled SIAS 7-item. Full-scale cutoff ≥36/80 indicates clinical-level social anxiety (norm α>0.9)  :contentReference[oaicite:9]{index=9}  
- cognitive_distortion: CD‑Quest-like scale 0‑21. Full-scale mean ≈22.6 (SD ≈11.9), normalized cut at ≥14 for moderate, ≥21 for high (α ≈0.85)  :contentReference[oaicite:10]{index=10}  
- self_esteem: Rosenberg self-esteem total 0‑30; ≤14 low, 15‑25 normal, ≥26 high (excellent reliability)  :contentReference[oaicite:11]{index=11}  
- sleep_disruption: key insomnia items scaled 0‑12; ≥15 on 7-item ISI indicates moderate insomnia  :contentReference[oaicite:12]{index=12}  
- functional_impairment: WHODAS items scaled 0‑12 for daily tasks, concentration, and social participation.

Tagging Logic:
- Tags are exactly one per domain in the form: 
  depression_none_mild_moderate_moderately_severe_severe
  etc., matching the normalized score bands for each domain.

Part A – Narrative Summary (Max 3 sentences):
Highlight only domains where severity is above "mild" (e.g., moderate or higher ), and say what they indicate. Also mention if multiple domains are high, to guide grouping.

Part B – Recommendations (3–5 items):
Based on elevated tags, recommend services such as:
- Group for moderate/severe depression
- CBT module for cognitive distortions
- Sleep hygiene coaching
- Self‑esteem building exercises
- Social anxiety skills workshop
If any PTSD or sleep tag is clinical-threshold or above, add clinical evaluation or clinician follow-up.

The final JSON should include:
1. `"domain_scores"` — raw integers
2. `"normalized_scores"` — each between 0–1
3. `"tags"` — array of severity tags
4. `"narrative_summary"` ≤ 3 sentences
5. `"recommendations"` — 3 to 5 distinct service suggestions
6. `"timestamp"` — ISO-8601 UTC timestamp of the response

Output only JSON (no additional commentary). Wrap the result exactly as the MentalHealthProfile schema.

---

Here are the user data inputs:

domain_scores: {domain_scores}
normalized_scores: {normalized_scores}
tags: {tags}
"""

DOMAIN_CONFIG = {
    "depression": (27, [(0, 4), (5, 9), (10, 14), (15, 19), (20, 27)]),
    "anxiety": (21, [(0, 4), (5, 9), (10, 14), (15, 21)]),
    "ptsd": (21, [(0, 30), (31, 33), (34, 80)]),
    "social_anxiety": (21, [(0, 20), (21, 33), (34, 43), (44, 80)]),
    "cognitive_distortion": (21, [(0, 14), (15, 20), (21, 21)]),
    "self_esteem": (30, [(0, 14), (15, 25), (26, 30)]),
    "sleep_disruption": (12, [(0, 3), (4, 6), (7, 12)]),
    "functional_impairment": (12, [(0, 3), (4, 6), (7, 12)]),
}
CD_MEAN = 22.6
CD_SD = 11.9


def classify(score: int, buckets: List[Tuple[int, int]]) -> str:
    for lo, hi in buckets:
        if lo <= score <= hi:
            return f"{lo}-{hi}"
    return "unknown"


def compute_tags(raw: Dict[str, int]) -> List[str]:
    tags = []
    for domain, (maxval, buckets) in DOMAIN_CONFIG.items():
        val = raw.get(domain, 0)
        label = classify(val, buckets)
        key = domain
        tags.append(f"{key}_{label}")
    return tags


def compute_profile(answers: Dict[str, int]) -> Tuple[Dict, Dict]:
    # Aggregate by domain keys (answers come pre-summed?)
    # Typically 'answers' is small dict mapping QIDs → {0..3}
    # Here, assume one-level 'domain_x': sum
    raw = {k: answers[k] for k in DOMAIN_CONFIG.keys()}
    normalized = {k: v / DOMAIN_CONFIG[k][0] for k, v in raw.items()}
    return raw, normalized


def generate_profile(answers: Dict[str, int]) -> MentalHealthProfile:
    domain_scores, normalized_scores = compute_profile(answers)
    tags = compute_tags(domain_scores)

    # Groq + Instructor initialization
    groq_client = Groq(api_key=settings.GROQ_API_KEY)
    client = instructor.from_groq(groq_client, mode=instructor.Mode.JSON)

    messages = [
        SYSTEM_MESSAGE,
        {
            "role": "user",
            "content": USER_PROMPT.format(
                domain_scores=json.dumps(domain_scores),
                normalized_scores=json.dumps(normalized_scores),
                tags=json.dumps(tags),
            ),
        },
    ]

    resp = client.chat.completions.create(
        model="mixtral-8x7b-32768",
        messages=messages,
        response_model=MentalHealthProfile,
    )
    return resp
