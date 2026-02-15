from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core import LectureSynth
from app.models import Lecture, JobResponse, ErrorResponse

app = FastAPI(
    title="LectureSynth API",
    description="Enterprise-grade educational pipeline transforming PDF lectures into knowledge graphs.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Core System
synth_system = LectureSynth()

@app.post("/upload", response_model=Lecture, responses={400: {"model": ErrorResponse}})
async def upload_lecture(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Upload a PDF lecture to begin processing.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        content = await file.read()
        
        # 1. Ingest
        lecture = await synth_system.ingest(file.filename, content)
        
        # 2. Trigger Background Processing
        background_tasks.add_task(synth_system.process_background, lecture.id)
        
        return lecture
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from app.schemas import AnalyzeRequest

@app.post("/analyze")
async def analyze_slide(request: AnalyzeRequest):
    """
    Secure proxy for Gemini API analysis.
    """
    try:
        # Delegate to the trusted backend engine
        result = await synth_system.ai_engine.analyze_slide(
            request.base64_image, 
            request.page_number,
            request.retry_count,
            request.model
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models")
async def list_models():
    """
    List available Gemini models.
    """
    try:
        models = synth_system.ai_engine.list_models()
        return {"models": models, "default": synth_system.ai_engine.default_model}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/lectures", response_model=list[Lecture])
async def list_lectures():
    """
    List all saved lectures.
    """
    import os, json
    lectures = []
    for storage_dir in ["saved_storage", "temp_storage"]:
        if not os.path.exists(storage_dir):
            continue
        for entry in os.listdir(storage_dir):
            meta_path = os.path.join(storage_dir, entry, "metadata.json")
            if os.path.isfile(meta_path):
                try:
                    with open(meta_path, "r") as f:
                        data = json.load(f)
                        lectures.append(Lecture(**data))
                except Exception:
                    pass
    return lectures

@app.delete("/lectures/{lecture_id}")
async def delete_lecture(lecture_id: str):
    """
    Permanently delete a stored lecture.
    """
    import os, shutil
    deleted = False
    for storage_dir in ["saved_storage", "temp_storage"]:
        lecture_path = os.path.join(storage_dir, lecture_id)
        if os.path.exists(lecture_path):
            shutil.rmtree(lecture_path)
            deleted = True
    if not deleted:
        raise HTTPException(status_code=404, detail="Lecture not found")
    return {"status": "deleted", "id": lecture_id}

@app.get("/lectures/{lecture_id}", response_model=Lecture, responses={404: {"model": ErrorResponse}})
async def get_lecture_status(lecture_id: str):
    """
    Poll the status of a specific lecture processing job.
    """
    lecture = synth_system.get_lecture(lecture_id)
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")
    return lecture

@app.post("/lectures/{lecture_id}/save", response_model=Lecture)
async def save_lecture(lecture_id: str):
    """
    Permanently save a lecture (move from temp to saved storage).
    """
    try:
        lecture = synth_system.save_lecture_permanently(lecture_id)
        if not lecture:
            raise HTTPException(status_code=404, detail="Lecture not found or could not be saved")
        return lecture
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/lectures/store", response_model=Lecture)
async def store_lecture(lecture: Lecture):
    """
    Store a full lecture payload directly (for client-side processed lectures).
    """
    try:
        import os, json
        lecture.is_saved = True
        lecture_dir = os.path.join("saved_storage", lecture.id)
        os.makedirs(lecture_dir, exist_ok=True)
        with open(os.path.join(lecture_dir, "metadata.json"), "w") as f:
            f.write(lecture.json())
        return lecture
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/lectures/{lecture_id}/download")
async def download_vault(lecture_id: str):
    """
    Download the processed Knowledge Graph as an Obsidian Vault (ZIP).
    """
    try:
        zip_buffer = synth_system.generate_export(lecture_id)
        
        # Determine filename
        lecture = synth_system.get_lecture(lecture_id)
        filename = lecture.filename.replace('.pdf', '') if lecture else "lecture"
        
        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename={filename}-obsidian-vault.zip"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def health_check():
    return {"status": "ok", "service": "LectureSynth API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
