from typing import Dict, List, Optional


def apply_permutation(term: str, permutation_id: str, params: Optional[Dict]) -> List[str]:
    if permutation_id == "reverse":
        return [term, term[::-1]]
    if permutation_id == "double":
        level = (params or {}).get("level", "low")
        max_rep = {"low": 2, "medium": 3, "high": 4}.get(level, 2)
        out = [term]
        for i in range(2, max_rep + 1):
            out.append(term * i)
        return out
    # default / none
    return [term]


def expand_terms(terms: List[str], permutation_id: str, params: Optional[Dict]) -> Dict[str, List[str]]:
    result: Dict[str, List[str]] = {}
    for term in terms:
        result[term] = apply_permutation(term, permutation_id, params)
    return result

