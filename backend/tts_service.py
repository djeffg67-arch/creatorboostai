"""OpenAI TTS via emergentintegrations + on-disk cache."""
import os
import hashlib
import logging
from pathlib import Path
from typing import Optional

from emergentintegrations.llm.openai import OpenAITextToSpeech

logger = logging.getLogger(__name__)

CACHE_DIR = Path("/tmp/tts_cache")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "").strip()
ALLOWED_VOICES = {"alloy", "ash", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"}
DEFAULT_VOICE = "sage"
DEFAULT_MODEL = "tts-1"
MAX_TEXT_LEN = 4000


def _key(text: str, voice: str, model: str) -> str:
    return hashlib.sha256(f"{model}|{voice}|{text}".encode("utf-8")).hexdigest()


def cached_path(text: str, voice: str, model: str) -> Path:
    return CACHE_DIR / f"{_key(text, voice, model)}.mp3"


async def generate_or_cache(
    text: str,
    voice: str = DEFAULT_VOICE,
    model: str = DEFAULT_MODEL,
) -> Optional[bytes]:
    if not EMERGENT_LLM_KEY:
        logger.warning("EMERGENT_LLM_KEY missing; TTS disabled")
        return None
    if voice not in ALLOWED_VOICES:
        voice = DEFAULT_VOICE
    text = (text or "").strip()
    if not text:
        return None
    if len(text) > MAX_TEXT_LEN:
        text = text[:MAX_TEXT_LEN]

    path = cached_path(text, voice, model)
    if path.exists() and path.stat().st_size > 0:
        return path.read_bytes()

    try:
        tts = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
        audio = await tts.generate_speech(text=text, model=model, voice=voice)
        path.write_bytes(audio)
        return audio
    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        return None
