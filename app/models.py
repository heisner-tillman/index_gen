from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
import uuid

class ProcessingStatus(str, Enum):
    PENDING = 'pending'
    PROCESSING = 'processing'
    COMPLETED = 'completed'
    FAILED = 'failed'

class Flashcard(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    front: str = Field(..., description="A concise conceptual cue, keyword, or question.")
    back: str = Field(..., description="A highly compressed, bulleted, or narrative explanation.")
    page_number: int
    status: ProcessingStatus = ProcessingStatus.PENDING
    error: Optional[str] = None

class Lecture(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    upload_date: float
    total_slides: int
    processed_slides: int
    cards: List[Flashcard]
    status: ProcessingStatus
    is_saved: bool = False

class JobResponse(BaseModel):
    job_id: str
    message: str

class ErrorResponse(BaseModel):
    detail: str
