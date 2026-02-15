import os
import shutil
import json
import logging
import asyncio
import time
import io
import re
import zipfile
from typing import Optional, List
from app.models import Lecture, Flashcard, ProcessingStatus
from app.services.pdf_engine import PDFEngine
from app.services.ai_engine import AIEngine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TEMP_STORAGE_DIR = "temp_storage"
SAVED_STORAGE_DIR = "saved_storage"

# Ensure directories exist
os.makedirs(TEMP_STORAGE_DIR, exist_ok=True)
os.makedirs(SAVED_STORAGE_DIR, exist_ok=True)

class LectureSynth:
    """
    The core module orchestrating the ingestion, synthesis, and export pipelines.
    """
    def __init__(self):
        self.ai_engine = AIEngine()
        self.pdf_engine = PDFEngine()
        # Limit concurrent Gemini requests to avoid hitting rate limits too fast
        self.semaphore = asyncio.Semaphore(3) 

    def _get_storage_path(self, lecture_id: str) -> str:
        """
        Check if we have a saved version, otherwise default to temp.
        """
        saved_path = os.path.join(SAVED_STORAGE_DIR, lecture_id)
        if os.path.exists(saved_path):
            return saved_path
        return os.path.join(TEMP_STORAGE_DIR, lecture_id)

    async def ingest(self, filename: str, file_bytes: bytes) -> Lecture:
        """
        Step 1: Ingest PDF, extract basic info, initialize state.
        """
        try:
            from pdf2image import pdfinfo_from_bytes
            info = pdfinfo_from_bytes(file_bytes)
            page_count = info.get('Pages', 0)
        except Exception:
            page_count = await self.pdf_engine.extract_info(file_bytes)

        lecture = Lecture(
            filename=filename,
            upload_date=time.time() * 1000,
            total_slides=page_count,
            processed_slides=0,
            cards=[],
            status=ProcessingStatus.PENDING,
            is_saved=False
        )
        
        # Initialize placeholder cards
        for i in range(page_count):
            lecture.cards.append(Flashcard(
                front="", 
                back="", 
                page_number=i + 1, 
                status=ProcessingStatus.PENDING
            ))
            
        # Create temp directory
        lecture_dir = os.path.join(TEMP_STORAGE_DIR, lecture.id)
        os.makedirs(lecture_dir, exist_ok=True)

        # Save PDF
        with open(os.path.join(lecture_dir, "source.pdf"), "wb") as f:
            f.write(file_bytes)
            
        # Save Metadata
        self._save_metadata(lecture, lecture_dir)
        
        return lecture

    def _save_metadata(self, lecture: Lecture, directory: str):
        with open(os.path.join(directory, "metadata.json"), "w") as f:
            f.write(lecture.json())

    def _load_metadata(self, lecture_id: str) -> Optional[Lecture]:
        path = self._get_storage_path(lecture_id)
        meta_path = os.path.join(path, "metadata.json")
        if not os.path.exists(meta_path):
            return None
        try:
            with open(meta_path, "r") as f:
                data = json.load(f)
                return Lecture(**data)
        except Exception as e:
            logger.error(f"Failed to load metadata for {lecture_id}: {e}")
            return None

    async def process_background(self, lecture_id: str):
        """
        Step 2: Background task to process slides.
        """
        lecture = self.get_lecture(lecture_id)
        if not lecture:
            return

        lecture_dir = self._get_storage_path(lecture_id)
        pdf_path = os.path.join(lecture_dir, "source.pdf")
        
        if not os.path.exists(pdf_path):
            lecture.status = ProcessingStatus.FAILED
            self._save_metadata(lecture, lecture_dir)
            return
            
        with open(pdf_path, "rb") as f:
            file_bytes = f.read()

        lecture.status = ProcessingStatus.PROCESSING
        self._save_metadata(lecture, lecture_dir)
        
        async def process_single_card(card: Flashcard):
            async with self.semaphore:
                try:
                    card.status = ProcessingStatus.PROCESSING
                    
                    # 1. Render
                    b64_img = await self.pdf_engine.render_page(file_bytes, card.page_number)
                    
                    # 2. Analyze
                    result = await self.ai_engine.analyze_slide(b64_img, card.page_number)
                    
                    # 3. Update
                    card.front = result.get('front', '')
                    card.back = result.get('back', '')
                    card.status = ProcessingStatus.COMPLETED
                    
                    # Update progress
                    lecture.processed_slides += 1
                    
                except Exception as e:
                    card.status = ProcessingStatus.FAILED
                    card.error = str(e)
                finally:
                    # Sync to disk periodically or on state change could be optimized, 
                    # but for simplicity we save occasionally or at end.
                    # Here we rely on final save, or could save per card if critical.
                    pass

        # Create tasks for all cards
        tasks = [process_single_card(card) for card in lecture.cards]
        await asyncio.gather(*tasks)
        
        lecture.status = ProcessingStatus.COMPLETED
        self._save_metadata(lecture, lecture_dir)

    def get_lecture(self, lecture_id: str) -> Optional[Lecture]:
        return self._load_metadata(lecture_id)

    def save_lecture_permanently(self, lecture_id: str) -> Optional[Lecture]:
        """
        Move from temp to saved storage.
        """
        lecture = self.get_lecture(lecture_id)
        if not lecture:
            return None
            
        if lecture.is_saved:
            return lecture

        source_dir = os.path.join(TEMP_STORAGE_DIR, lecture_id)
        dest_dir = os.path.join(SAVED_STORAGE_DIR, lecture_id)
        
        if not os.path.exists(source_dir):
            return None

        # Move directory
        shutil.move(source_dir, dest_dir)
        
        # Update flag
        lecture.is_saved = True
        self._save_metadata(lecture, dest_dir)
        
        return lecture

    def generate_export(self, lecture_id: str) -> io.BytesIO:
        """
        Step 3: Generate Obsidian Vault ZIP
        """
        lecture = self.get_lecture(lecture_id)
        if not lecture:
            raise ValueError("Lecture not found")

        zip_buffer = io.BytesIO()
        
        def sanitize_filename(name: str) -> str:
            name = re.sub(r'[<>:"/\\|?*]', '-', name)
            name = re.sub(r'(^\s+|\s+$|\.+$)', '', name)
            name = re.sub(r'-+', '-', name)
            return name or 'Untitled'

        folder_name = sanitize_filename(lecture.filename.replace('.pdf', ''))

        with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
            # Master Note
            master_content = (
                f"# {folder_name}\n\n"
                f"Processed on: {time.ctime(lecture.upload_date / 1000)}\n"
                f"Total Slides: {lecture.total_slides}\n\n"
                "## Concepts\n"
            )
            zip_file.writestr(f"{folder_name}/{folder_name}.md", master_content)

            used_filenames = set()

            # Individual Cards
            for card in lecture.cards:
                if card.status != ProcessingStatus.COMPLETED:
                    continue

                filename = sanitize_filename(card.front)
                if filename in used_filenames:
                    counter = 1
                    while f"{filename}-{counter}" in used_filenames:
                        counter += 1
                    filename = f"{filename}-{counter}"
                used_filenames.add(filename)

                content = (
                    f"# {card.front}\n\n"
                    f"[[{folder_name}]] (Page {card.page_number})\n\n"
                    f"## Front\n{card.front}\n\n"
                    f"## Back\n{card.back}\n"
                )
                zip_file.writestr(f"{folder_name}/{filename}.md", content)

            # Google Apps Script
            esc_title = lecture.filename.replace('.pdf', '').replace('\\', '\\\\').replace("'", "\\'").replace("\n", "\\n")
            
            # Simple list of dicts for the JS script
            js_cards = [
                {"front": c.front, "back": c.back, "page": c.page_number} 
                for c in lecture.cards if c.status == ProcessingStatus.COMPLETED
            ]
            
            script_content = f"""/**
 * Google Apps Script to generate Google Slides from LectureSynth JSON
 * Copy and paste this into https://script.google.com/home
 */
function createPresentation() {{
  var title = '{esc_title}';
  var slides = SlidesApp.create(title);
  var deck = slides.getSlides();
  if (deck.length > 0) {{
    deck[0].remove();
  }}

  var cards = {json.dumps(js_cards)};

  cards.forEach(function(card) {{
    var slide = slides.appendSlide(SlidesApp.SlideLayout.TITLE_AND_BODY);
    
    // Set Title (Front)
    var titleShape = slide.getPlaceholder(SlidesApp.PlaceholderType.TITLE);
    titleShape.asShape().getText().setText(card.front);

    // Set Body (Back)
    var bodyShape = slide.getPlaceholder(SlidesApp.PlaceholderType.BODY);
    bodyShape.asShape().getText().setText(card.back);
    
    var footer = slide.insertTextBox("Source: Page " + card.page, 0, 400, 300, 50);
    footer.getText().getTextStyle().setFontSize(10).setForegroundColor('#888888');
  }});

  Logger.log('Presentation created: ' + slides.getUrl());
}}
"""
            zip_file.writestr(f"{folder_name}/create_slides_script.txt", script_content)

        zip_buffer.seek(0)
        return zip_buffer

