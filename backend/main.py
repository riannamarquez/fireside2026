import mimetypes
import threading
import os
from typing import Any, Literal
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, UploadFile
from pydantic import BaseModel
from supabase import create_client

import ai

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env")

sb = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="dt-hackathon API")
router = APIRouter(prefix="/api")


# ---------- Models ----------

class Stage(BaseModel):
    label: str
    place: str | None = None
    start_year: int | None = None
    end_year: int | None = None
    notes: str | None = None


class Person(BaseModel):
    name: str
    nickname: str | None = None
    relationship: str | None = None


ChapterStatus = Literal["draft", "approved", "hidden"]


class ChapterUpdate(BaseModel):
    status: ChapterStatus | None = None
    title: str | None = None
    body: Any = None  # jsonb column: string or structured JSON


# ---------- Shared helpers (also used by seed.py) ----------

def get_life_map() -> list[dict]:
    return sb.table("life_stages").select("*").order("start_year").execute().data


def get_people() -> list[dict]:
    return sb.table("people").select("*").order("name").execute().data


def insert_stages(stages: list[Stage]) -> list[dict]:
    return sb.table("life_stages").insert([s.model_dump() for s in stages]).execute().data


def insert_people(people: list[Person]) -> list[dict]:
    return sb.table("people").insert([p.model_dump() for p in people]).execute().data


def require_ai():
    """Refuse instead of saving stub transcripts when this backend has no OpenAI key."""
    if ai.client is None:
        raise HTTPException(503, "This backend has no OPENAI_API_KEY. Add it to backend/.env and restart the backend.")


def transcribe_and_tag(data: bytes, path: str) -> tuple[str, dict, int | None]:
    """Audio -> (transcript, tags, valid stage_id). Shared by upload and reprocess."""
    life_map = get_life_map()
    people = get_people()
    transcript = ai.transcribe(data, path, people)
    tags = ai.tag_memo(transcript, life_map, people)

    # Only keep stage_id if it's a real stage, so a bad AI guess can't break the insert
    try:
        stage_id = int(tags.get("stage_id"))
    except (TypeError, ValueError):
        stage_id = None
    if stage_id not in {s["id"] for s in life_map}:
        stage_id = None
    return transcript, tags, stage_id


def create_memo(data: bytes, filename: str, content_type: str | None) -> dict:
    require_ai()
    content_type = content_type or mimetypes.guess_type(filename)[0] or "audio/webm"
    ext = os.path.splitext(filename)[1] or ".webm"
    path = f"{uuid4()}{ext}"

    sb.storage.from_("memos").upload(path, data, {"content-type": content_type})
    url = sb.storage.from_("memos").get_public_url(path)

    transcript, tags, stage_id = transcribe_and_tag(data, path)

    row = sb.table("memos").insert({
        "audio_url": url,
        "transcript": transcript,
        "tags": tags,
        "stage_id": stage_id,
    }).execute()
    return row.data[0]


def generate_chapter(stage_id: int) -> dict:
    stages = sb.table("life_stages").select("*").eq("id", stage_id).execute().data
    if not stages:
        raise HTTPException(404, "Stage not found")
    memos = (
        sb.table("memos").select("*").eq("stage_id", stage_id)
        .order("created_at").execute().data
    )
    if not memos:
        raise HTTPException(400, "No memos for this stage yet")

    chapter = ai.write_chapter(stages[0], memos)
    row = sb.table("chapters").insert({
        "stage_id": stage_id,
        "title": chapter.get("title"),
        "body": chapter["body"],
        "status": "draft",
    }).execute()
    return row.data[0]


# ---------- Onboarding ----------

@router.post("/life-map")
def post_life_map(stages: list[Stage]):
    return insert_stages(stages)


@router.get("/life-map")
def read_life_map():
    return get_life_map()


@router.post("/people")
def post_people(people: list[Person]):
    return insert_people(people)


@router.get("/people")
def read_people():
    return get_people()


# ---------- Memos ----------

@router.post("/memos")
async def upload_memo(file: UploadFile):
    data = await file.read()
    return create_memo(data, file.filename or "memo.webm", file.content_type)


@router.get("/memos")
def list_memos(stage_id: int | None = None):
    query = sb.table("memos").select("*").order("created_at")
    if stage_id is not None:
        query = query.eq("stage_id", stage_id)
    return query.execute().data


@router.post("/memos/{memo_id}/reprocess")
def reprocess_memo(memo_id: int):
    """Re-run transcription + tagging on a memo's saved audio (e.g. one saved with a stub transcript)."""
    require_ai()
    rows = sb.table("memos").select("*").eq("id", memo_id).execute().data
    if not rows:
        raise HTTPException(404, "Memo not found")
    url = rows[0].get("audio_url") or ""
    path = url.split("/memos/")[-1] if "/memos/" in url else None
    if not path:
        raise HTTPException(400, "This memo has no saved audio")
    data = sb.storage.from_("memos").download(path)
    transcript, tags, stage_id = transcribe_and_tag(data, path)
    return sb.table("memos").update(
        {"transcript": transcript, "tags": tags, "stage_id": stage_id}
    ).eq("id", memo_id).execute().data[0]


@router.post("/memos/{memo_id}/storybook")
def post_storybook(memo_id: int, regenerate: bool = False):
    """Storytime: turn one memo into a rhyming kids' picture book. Saved in memos.tags.storybook."""
    rows = sb.table("memos").select("*").eq("id", memo_id).execute().data
    if not rows:
        raise HTTPException(404, "Memo not found")
    memo = rows[0]
    tags = memo.get("tags") or {}
    if tags.get("sensitive"):
        raise HTTPException(403, "This memory is private, so it can't become a storybook.")
    if not memo.get("transcript"):
        raise HTTPException(400, "This memory hasn't been transcribed yet.")
    if tags.get("storybook") and not regenerate:
        return tags["storybook"]

    stage = None
    if memo.get("stage_id") is not None:
        found = sb.table("life_stages").select("*").eq("id", memo["stage_id"]).execute().data
        stage = found[0] if found else None

    book = ai.write_storybook(memo, stage, get_people())
    sb.table("memos").update({"tags": {**tags, "storybook": book}}).eq("id", memo_id).execute()
    return book


_render_lock = threading.Lock()  # the renderer's style settings are module-level, so one render at a time
MOVIE_STYLES = {"watercolor", "bedtime", "crayon"}
MOVIE_PACES = {"calm", "normal", "lively"}


@router.post("/memos/{memo_id}/storybook/video")
def post_storybook_video(memo_id: int, regenerate: bool = False, style: str = "watercolor", pace: str = "normal"):
    """Storytime movie: render the storybook as one continuous animation (frames + sound in code).
    Each style/pace is cached in tags.storybook.videos["<style>-<pace>"] = {url, rest_times, duration, style, pace}."""
    import tempfile
    from motion.storyanim import render_storybook_video

    if style not in MOVIE_STYLES or pace not in MOVIE_PACES:
        raise HTTPException(400, f"style must be one of {sorted(MOVIE_STYLES)}, pace one of {sorted(MOVIE_PACES)}")
    rows = sb.table("memos").select("*").eq("id", memo_id).execute().data
    if not rows:
        raise HTTPException(404, "Memo not found")
    tags = rows[0].get("tags") or {}
    book = tags.get("storybook")
    if not book:
        raise HTTPException(400, "Make the storybook first.")
    key = f"{style}-{pace}"
    videos = dict(book.get("videos") or {})
    if book.get("video") and "watercolor-normal" not in videos:  # movies made before styles existed
        videos["watercolor-normal"] = {**book["video"], "style": "watercolor", "pace": "normal"}
    if videos.get(key) and not regenerate:
        return videos[key]

    out = os.path.join(tempfile.mkdtemp(prefix="storytime-"), "movie.mp4")
    with _render_lock:
        result = render_storybook_video({"title": book["title"], "pages": book["pages"]}, out, style=style, pace=pace)
    path = f"storytime/{memo_id}-{key}-{uuid4().hex[:8]}.mp4"
    with open(out, "rb") as f:
        sb.storage.from_("memos").upload(path, f.read(), {"content-type": "video/mp4"})
    video = {
        "url": sb.storage.from_("memos").get_public_url(path),
        "rest_times": result["rest_times"],
        "duration": result["duration"],
        "style": style,
        "pace": pace,
    }
    videos[key] = video
    # re-read tags so a storybook regenerated meanwhile isn't overwritten with stale data
    latest = (sb.table("memos").select("tags").eq("id", memo_id).execute().data[0].get("tags") or {})
    sb.table("memos").update({"tags": {**latest, "storybook": {**(latest.get("storybook") or book), "videos": videos}}}).eq("id", memo_id).execute()
    return video


# ---------- Chapters ----------

@router.post("/chapters/generate")
def post_generate_chapter(stage_id: int):
    return generate_chapter(stage_id)


@router.patch("/chapters/{chapter_id}")
def update_chapter(chapter_id: int, update: ChapterUpdate):
    changes = update.model_dump(exclude_none=True)
    if not changes:
        raise HTTPException(400, "Nothing to update")
    rows = sb.table("chapters").update(changes).eq("id", chapter_id).execute().data
    if not rows:
        raise HTTPException(404, "Chapter not found")
    return rows[0]


@router.get("/chapters")
def list_chapters(status: ChapterStatus | None = None, stage_id: int | None = None):
    query = sb.table("chapters").select("*").order("id")
    if status:
        query = query.eq("status", status)
    if stage_id is not None:
        query = query.eq("stage_id", stage_id)
    return query.execute().data


class SensitivityRequest(BaseModel):
    transcript: str


@router.post("/sensitivity")
def post_sensitivity(req: SensitivityRequest):
    """Postscript: does this letter mention difficult moments? The frontend falls back to a keyword check if this fails."""
    require_ai()
    return ai.check_sensitivity(req.transcript)


app.include_router(router)
