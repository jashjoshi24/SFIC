# SFIC Faster-Whisper microservice

Python service used internally by the existing Express backend. It exposes `POST /transcribe` and `GET /health`. The browser should call Express, not this service directly. Whisper automatically detects Gujarati, Hindi, or English; it does not translate speech. Other detected languages receive an unsupported-language response.

## Local setup (Windows PowerShell)

```powershell
cd whisper-service
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:WHISPER_MODEL="small"
$env:WHISPER_DEVICE="cpu"
$env:WHISPER_COMPUTE_TYPE="int8"
$env:WHISPER_MODEL_DIR="$PWD\model-cache"
uvicorn main:app --reload --port 8000
```

First startup downloads the model into the cache. Keep that cache outside Git.

## Language handling

Language detection is automatic (`language=None`). Only Gujarati (`gu`), Hindi (`hi`), and English (`en`) are accepted. No manual language selector is required. The service uses the transcription task, not translation.

## Environment variables

- `WHISPER_MODEL`: `tiny`, `base`, `small`, `medium`, or `large-v3` (default `small`).
- `WHISPER_DEVICE`: `cpu` or `cuda` (default `cpu`).
- `WHISPER_COMPUTE_TYPE`: normally `int8` for CPU or `float16` / `int8_float16` for CUDA.
- `WHISPER_MODEL_DIR`: writable model cache directory.
- `MAX_AUDIO_BYTES`: maximum upload size in bytes (default 25 MiB).

## Docker (CPU-oriented)

```bash
docker build -t sfic-whisper .
docker run --rm -p 8000:8000 -v whisper-model-cache:/app/model-cache sfic-whisper
```

GPU deployment needs a compatible NVIDIA runtime and CUDA/cuDNN libraries; the included Dockerfile is CPU-oriented. Do not commit model weights or audio recordings to Git.
