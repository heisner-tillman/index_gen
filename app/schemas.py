from pydantic import BaseModel
from typing import Optional

class AnalyzeRequest(BaseModel):
    base64_image: str
    page_number: int
    retry_count: Optional[int] = 0
