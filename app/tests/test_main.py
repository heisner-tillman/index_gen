from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch, AsyncMock
import pytest
from app.main import app
from app.models import Lecture

client = TestClient(app)

# Mock the synth_system
@pytest.fixture
def mock_synth_system():
    with patch("app.main.synth_system") as mock_system:
        yield mock_system

def test_health_check(mock_synth_system):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "LectureSynth API"}

def test_upload_lecture_success(mock_synth_system):
    mock_file = io.BytesIO(b"%PDF-1.4 content")
    
    mock_lecture = Lecture(
        id="test-id", 
        filename="test.pdf", 
        upload_date=123456, 
        total_slides=5, 
        processed_slides=0, 
        cards=[], 
        status="processing"
    )
    
    # Mock async method ingest
    mock_synth_system.ingest = AsyncMock(return_value=mock_lecture)
    
    response = client.post(
        "/upload",
        files={"file": ("test.pdf", mock_file, "application/pdf")}
    )
    
    assert response.status_code == 200
    assert response.json()["id"] == "test-id"
    # Ensure background task was added (we can't easily check BackgroundTasks execution in TestClient 
    # without running the event loop, but we can check if ingest was called)
    mock_synth_system.ingest.assert_called_once()

def test_upload_invalid_file_type(mock_synth_system):
    mock_file = io.BytesIO(b"text content")
    response = client.post(
        "/upload",
        files={"file": ("test.txt", mock_file, "text/plain")}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Only PDF files are supported."

def test_get_lecture_status_success(mock_synth_system):
    mock_lecture = Lecture(
        id="test-id", 
        filename="test.pdf", 
        upload_date=123456, 
        total_slides=5, 
        processed_slides=2, 
        cards=[], 
        status="processing"
    )
    mock_synth_system.get_lecture.return_value = mock_lecture
    
    response = client.get("/lectures/test-id")
    assert response.status_code == 200
    assert response.json()["id"] == "test-id"

def test_get_lecture_status_not_found(mock_synth_system):
    mock_synth_system.get_lecture.return_value = None
    response = client.get("/lectures/not-found")
    assert response.status_code == 404

def test_save_lecture_success(mock_synth_system):
    mock_lecture = Lecture(
        id="test-id", 
        filename="test.pdf", 
        upload_date=123456, 
        total_slides=5, 
        processed_slides=5, 
        cards=[], 
        status="completed",
        is_saved=True
    )
    mock_synth_system.save_lecture_permanently.return_value = mock_lecture
    
    response = client.post("/lectures/test-id/save")
    assert response.status_code == 200
    assert response.json()["is_saved"] is True

import io
def test_download_vault_success(mock_synth_system):
    mock_synth_system.generate_export.return_value = io.BytesIO(b"zip content")
    mock_synth_system.get_lecture.return_value = Lecture(
        id="test-id", 
        filename="test.pdf", 
        upload_date=123456, 
        total_slides=1, 
        processed_slides=1, 
        cards=[], 
        status="completed"
    )
    
    response = client.get("/lectures/test-id/download")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
