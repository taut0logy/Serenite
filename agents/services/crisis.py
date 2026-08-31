"""Crisis resources and deterministic risk detection.

Reads `config/crisis_resources.json`, which is a byte-identical copy of
`client/src/lib/crisis/resources.json`. That file is the canonical one, and a
test in the client fails if the two drift.

Two copies rather than one shared package because these are separate
deployables. The drift test is what makes that safe: the failure mode being
guarded against is somebody correcting a number in one place and leaving the
other pointing at a line that no longer answers.

Before this, the assistant recited United States numbers, 988 and 911, which
would not have connected anyone in Bangladesh.
"""

from __future__ import annotations

import json
import logging
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_DATA_PATH = Path(__file__).resolve().parent.parent / "config" / "crisis_resources.json"


@lru_cache(maxsize=1)
def _data() -> dict[str, Any]:
    return json.loads(_DATA_PATH.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def resources() -> list[dict[str, Any]]:
    """Crisis resources, in the order a member in trouble needs them.

    Emergency first, then the suicide-prevention line, then general health.
    Deliberately not ordered by opening hours: doing that put a general medical
    advice number above the only crisis line, which is the wrong thing to put
    in front of someone who has just said they want to die. Hours travel with
    every entry instead.
    """
    order = {"emergency": 0, "crisis": 1, "health": 2}
    entries = list(_data()["resources"])
    entries.sort(key=lambda r: order.get(r.get("kind", ""), 99))
    return entries


@lru_cache(maxsize=1)
def _patterns() -> list[re.Pattern[str]]:
    return [re.compile(p, re.IGNORECASE) for p in _data()["riskPatterns"]]


def detect_risk_disclosure(text: str) -> bool:
    """Whether free text carries an explicit disclosure.

    The deterministic floor under the assistant's own judgement. The crisis
    branch used to fire only when the model said so, which meant a provider
    outage, a refusal, or a model simply reading the message differently could
    let a disclosure pass. This does not depend on any of that.

    Blunt by design: false positives cost a panel nobody needed, false
    negatives cost far more.
    """
    if not text:
        return False
    return any(p.search(text) for p in _patterns())


def crisis_message() -> str:
    """The text the assistant puts in front of a member, before anything else.

    Built from the data rather than written inline so there is one place to
    correct a number, and so hours travel with it: a line presented without
    them reads as always open, and the only crisis line here is not.
    """
    lines = [
        "I want to make sure you have someone to talk to right now.",
        "",
    ]
    for entry in resources():
        lines.append(f"- {entry['name']}: {entry['number']} ({entry['hours']})")
        lines.append(f"  {entry['purpose']}")
    lines.extend(
        [
            "",
            "I am not a crisis service and I cannot reach anyone on your behalf. "
            "If you are in immediate danger, please call 999.",
            "",
            "I am still here if you would like to keep talking.",
        ]
    )
    return "\n".join(lines)
