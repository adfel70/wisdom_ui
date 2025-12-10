from typing import Any, Dict, List, Optional


def paginate_rows(rows: List[List[str]], start_row: int, size: int, page_number: int) -> Dict[str, Any]:
    total = len(rows)
    start = max(start_row, 0)
    end = start + size
    page_rows = rows[start:end]
    next_offset: Optional[int] = end if end < total else None
    has_more = end < total
    return {
        "rows": page_rows,
        "pagination": {
            "hasMore": has_more,
            "nextOffset": next_offset,
            "pageNumber": page_number,
            "pageSize": size,
            "totalRecords": total,
        },
    }

