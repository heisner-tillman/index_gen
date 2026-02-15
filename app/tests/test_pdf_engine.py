import pytest
from unittest.mock import MagicMock, patch
from app.services.pdf_engine import PDFEngine
import io
from PIL import Image

@pytest.fixture
def mock_pdf_bytes():
    return b"%PDF-1.4 mock pdf content"

@pytest.mark.asyncio
async def test_extract_info_success(mock_pdf_bytes):
    with patch("pdf2image.pdfinfo_from_bytes") as mock_info:
        mock_info.return_value = {"Pages": 5}
        
        pages = await PDFEngine.extract_info(mock_pdf_bytes)
        
        assert pages == 5
        mock_info.assert_called_once_with(mock_pdf_bytes)

@pytest.mark.asyncio
async def test_extract_info_failure(mock_pdf_bytes):
    with patch("pdf2image.pdfinfo_from_bytes") as mock_info:
        mock_info.side_effect = Exception("PDF Error")
        
        pages = await PDFEngine.extract_info(mock_pdf_bytes)
        
        assert pages == 0

@pytest.mark.asyncio
async def test_render_page_success(mock_pdf_bytes):
    with patch("app.services.pdf_engine.convert_from_bytes") as mock_convert:
        # Create a mock image
        mock_img = Image.new('RGB', (100, 100), color='red')
        mock_convert.return_value = [mock_img]
        
        base64_str = await PDFEngine.render_page(mock_pdf_bytes, 1)
        
        assert isinstance(base64_str, str)
        assert len(base64_str) > 0
        mock_convert.assert_called_once()

@pytest.mark.asyncio
async def test_render_page_failure(mock_pdf_bytes):
    with patch("app.services.pdf_engine.convert_from_bytes") as mock_convert:
        mock_convert.return_value = []
        
        with pytest.raises(ValueError, match="Could not render page"):
            await PDFEngine.render_page(mock_pdf_bytes, 1)
