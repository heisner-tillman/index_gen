import os
import asyncio
import json
import base64
from google.genai import Client, types
from app.models import Flashcard

class AIEngine:
    def __init__(self):
        self.api_key = os.environ.get("API_KEY")
        if not self.api_key:
            raise ValueError("API_KEY environment variable is not set")
        self.client = Client(api_key=self.api_key)
        self.model_name = "gemini-2.5-flash"

    async def analyze_slide(self, base64_image: str, page_number: int, retry_count: int = 0) -> dict:
        """
        Analyzes a slide image and returns structured flashcard data.
        Implements exponential backoff.
        """
        
        flashcard_schema = {
            "type": "OBJECT",
            "properties": {
                "skip": {
                    "type": "BOOLEAN",
                    "description": "Set to true if this slide is a title page, section divider, table of contents, 'thank you' / 'questions?' slide, or essentially empty with no educational content worth indexing. Set to false for content-rich slides.",
                },
                "front": {
                    "type": "STRING",
                    "description": "A concise conceptual cue, keyword, or question derived directly from the slide's central theme. Keep it brief. If skip is true, set this to the slide's title text or 'Title Slide'.",
                },
                "back": {
                    "type": "STRING",
                    "description": "A highly compressed, bulleted, or narrative explanation answering the front cue. Use markdown for formatting. If skip is true, briefly describe why (e.g. 'Title slide', 'Section divider').",
                },
            },
            "required": ["skip", "front", "back"],
        }

        try:
            loop = asyncio.get_running_loop()
            
            def _generate():
                # Strip data URL prefix if present (e.g. "data:image/jpeg;base64,...")
                image_data = base64_image
                if image_data.startswith("data:"):
                    image_data = image_data.split(",", 1)[1]
                
                return self.client.models.generate_content(
                    model=self.model_name,
                    contents=[
                        types.Part.from_bytes(
                            data=base64.b64decode(image_data),
                            mime_type="image/jpeg"
                        ),
                        types.Part.from_text(
                            text=f"Analyze this lecture slide (Page {page_number}).\n\n"
                                 f"First, determine if this slide has real educational content.\n"
                                 f"Set 'skip' to true if the slide is any of these:\n"
                                 f"- A title page or cover slide\n"
                                 f"- A section divider or chapter heading\n"
                                 f"- A table of contents or outline slide\n"
                                 f"- A 'thank you', 'questions?', or closing slide\n"
                                 f"- An essentially empty or decorative slide\n\n"
                                 f"If 'skip' is false, synthesize an educational index card:\n"
                                 f"- 'front': a single clear concept or question\n"
                                 f"- 'back': a comprehensive but concise explanation\n"
                                 f"Ignore navigational elements or footers."
                        )
                    ],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=flashcard_schema,
                        temperature=0.3
                    )
                )

            response = await loop.run_in_executor(None, _generate)

            if response.text:
                return json.loads(response.text)
            raise ValueError("Empty response from model")

        except Exception as e:
            # Check for rate limit (429) logic
            is_rate_limit = "429" in str(e)
            
            if retry_count < 3 and is_rate_limit:
                delay = (2 ** retry_count) + (0.1 * retry_count) # Simple backoff
                print(f"Rate limit hit for page {page_number}. Retrying in {delay}s...")
                await asyncio.sleep(delay)
                return await self.analyze_slide(base64_image, page_number, retry_count + 1)
            
            print(f"Error analyzing slide {page_number}: {e}")
            raise e
