import asyncio
from pdf2image import convert_from_bytes
from typing import List, Tuple
import io
import base64

class PDFEngine:
    """
    Object-oriented wrapper for PDF processing.
    """
    
    @staticmethod
    async def extract_info(file_bytes: bytes) -> int:
        """
        Returns the number of pages in the PDF.
        Runs in a thread executor to avoid blocking the async event loop.
        """
        loop = asyncio.get_running_loop()
        # poppler's pdfinfo is wrapped by pdf2image but parsing pages is heavier.
        # We'll use convert_from_bytes just to get length or a lighter library if strictly needed.
        # For simplicity and robustness with pdf2image:
        try:
            # We don't actually convert here, just get info if possible, 
            # but pdf2image is primarily for conversion. 
            # Let's do a lightweight conversion of 1st page or just use the conversion method later.
            # Actually, pdf2image.pdfinfo_from_bytes is available in newer versions.
            from pdf2image import pdfinfo_from_bytes
            info = await loop.run_in_executor(None, pdfinfo_from_bytes, file_bytes)
            return info["Pages"]
        except Exception:
            # Fallback
            return 0

    @staticmethod
    async def render_page(file_bytes: bytes, page_number: int) -> str:
        """
        Renders a specific page to a base64 JPEG string.
        """
        loop = asyncio.get_running_loop()
        
        def _process():
            # pdf2image pages are 1-indexed (first_page=X, last_page=X)
            images = convert_from_bytes(
                file_bytes, 
                first_page=page_number, 
                last_page=page_number, 
                fmt='jpeg',
                dpi=200 # Roughly equivalent to scale 2.0
            )
            if not images:
                raise ValueError("Could not render page")
            
            img = images[0]
            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=85)
            return base64.b64encode(buffer.getvalue()).decode('utf-8')

        return await loop.run_in_executor(None, _process)
