
import asyncio
import os
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool
from faster_whisper import WhisperModel


# ==========================================
# CONFIGURATION
# ==========================================

MODEL_SIZE = os.getenv("WHISPER_MODEL", "medium")
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")

COMPUTE_TYPE = os.getenv(
    "WHISPER_COMPUTE_TYPE",
    "int8" if DEVICE == "cpu" else "float16"
)

MAX_FILE_SIZE = int(
    os.getenv("MAX_AUDIO_BYTES", str(25 * 1024 * 1024))
)

ALLOWED_AUDIO_EXTENSIONS = {
    ".wav",
    ".mp3",
    ".m4a",
    ".ogg",
    ".webm",
    ".weba",
    ".flac",
    ".mp4",
}

SUPPORTED_LANGUAGES = {
    "gu": "Gujarati",
    "hi": "Hindi",
    "en": "English",
}

whisper_model = None
inference_lock = asyncio.Lock()


# ==========================================
# MODEL LIFECYCLE
# ==========================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    global whisper_model

    print(f"Loading Whisper model: {MODEL_SIZE}")

    whisper_model = WhisperModel(
        MODEL_SIZE,
        device=DEVICE,
        compute_type=COMPUTE_TYPE,
        download_root=os.getenv(
            "WHISPER_MODEL_DIR",
            "/app/model-cache"
        ),
    )

    print("Whisper model loaded successfully.")

    yield

    whisper_model = None
    print("Whisper service stopped.")


app = FastAPI(
    title="SFIC Faster-Whisper Service",
    version="1.0.0",
    lifespan=lifespan
)


# ==========================================
# HEALTH CHECK
# ==========================================

@app.get("/health")
def health():
    return {
        "status": "ok" if whisper_model is not None else "loading",
        "model": MODEL_SIZE,
        "device": DEVICE,
    }


# ==========================================
# TRANSCRIPTION
# ==========================================

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):

    filename = file.filename or "audio.webm"
    extension = Path(filename).suffix.lower()

    # Validate extension
    if extension not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail="Unsupported audio format."
        )

    # Read uploaded audio
    content = await file.read(MAX_FILE_SIZE + 1)

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Audio file is empty."
        )

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Audio file exceeds 25 MB limit."
        )

    temp_path = None

    try:

        # Save audio temporarily
        with tempfile.NamedTemporaryFile(
            suffix=extension,
            delete=False
        ) as temp:

            temp.write(content)
            temp_path = temp.name

        def run_model():

            if whisper_model is None:
                raise RuntimeError("Whisper model is not loaded.")

            # Automatic language detection.
            # No fixed name, user identity, or language prompt.
            segments, info = whisper_model.transcribe(
                temp_path,
                language=None,
                task="transcribe",
                beam_size=5,
                vad_filter=True,
            )

            detected_language = info.language

            # Validate supported language
            if detected_language not in SUPPORTED_LANGUAGES:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "Unsupported language. "
                        "Please speak Gujarati, Hindi, or English."
                    )
                )

            # Collect transcription segments
            transcript = " ".join(
                segment.text.strip()
                for segment in segments
            ).strip()

            if not transcript:
                raise HTTPException(
                    status_code=422,
                    detail="No speech could be detected in the audio."
                )

            return {
                "success": True,
                "transcription": transcript,
                "language": detected_language,
                "language_name": SUPPORTED_LANGUAGES[
                    detected_language
                ],
                "language_probability": info.language_probability,
                "duration": info.duration,
            }

        # Serialize inference to protect available RAM/VRAM
        async with inference_lock:
            return await run_in_threadpool(run_model)

    except HTTPException:
        raise

    except Exception as exc:

        print(
            f"Transcription failed: {type(exc).__name__}: {exc}"
        )

        raise HTTPException(
            status_code=500,
            detail="Audio transcription failed."
        )

    finally:

        # Remove temporary audio file
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
