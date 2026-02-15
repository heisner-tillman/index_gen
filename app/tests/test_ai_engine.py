import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from app.services.ai_engine import AIEngine
import os
import json

@pytest.fixture
def mock_env_api_key(monkeypatch):
    monkeypatch.setenv("API_KEY", "test-api-key")

@pytest.fixture
def mock_ai_engine(mock_env_api_key):
    # Patch google.genai.types directly if possible, but better to patch where used.
    # The issue might be that types.Type is being accessed on the module mock.
    
    with patch("app.services.ai_engine.Client") as MockClient, \
         patch("app.services.ai_engine.types") as MockTypes:
        
        # Setup MockTypes
        mock_type_enum = MagicMock()
        mock_type_enum.OBJECT = "OBJECT"
        mock_type_enum.STRING = "STRING"
        MockTypes.Type = mock_type_enum
        
        engine = AIEngine()
        # Mock the async generate_content method
        engine.client.models.generate_content = MagicMock()
        return engine

def test_init_failure():
    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(ValueError, match="API_KEY environment variable is not set"):
            AIEngine()

@pytest.mark.asyncio
async def test_analyze_slide_success(mock_ai_engine):
    # Mock response
    mock_response = MagicMock()
    mock_response.text = json.dumps({"front": "Concept", "back": "Explanation"})
    
    mock_ai_engine.client.models.generate_content.return_value = mock_response

    # Valid base64 string
    valid_b64 = "c29tZSB2YWxpZCBkYXRh" 
    result = await mock_ai_engine.analyze_slide(valid_b64, 1)

    assert result["front"] == "Concept"
    assert result["back"] == "Explanation"
    mock_ai_engine.client.models.generate_content.assert_called_once()

@pytest.mark.asyncio
async def test_analyze_slide_retry_429(mock_ai_engine):
    # Mock side effect: first call raises 429, second call succeeds
    mock_response = MagicMock()
    mock_response.text = json.dumps({"front": "Retry Success", "back": "Exp"})
    
    # We need to simulate the executor behavior. 
    # Since run_in_executor runs a synchronous function, we mock the synchronous function behavior.
    # However, AIEngine calls run_in_executor with a wrapper.
    # We can mock run_in_executor to raise first, then return.
    
    with patch("asyncio.get_running_loop") as mock_loop:
        loop_mock = MagicMock()
        mock_loop.return_value = loop_mock
        
        # side_effect for run_in_executor
        call_count = 0
        async def side_effect(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise Exception("429 Resource Exhausted")
            return mock_response
            
        loop_mock.run_in_executor = AsyncMock(side_effect=side_effect)
        
        # Also need to mock sleep to speed up test
        with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            result = await mock_ai_engine.analyze_slide("base64_img", 1)
            
            assert result["front"] == "Retry Success"
            assert mock_sleep.called
