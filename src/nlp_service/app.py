from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from nlp_utils import find_similar_translations, extract_key_terms
from typing import Optional, List

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TranslationRequest(BaseModel):
    text: str
    translations: Optional[List[dict]] = None


@app.post("/suggest")
async def suggest_translations(request: TranslationRequest):
    """Suggest similar translations."""
    similar_translations = find_similar_translations(request.text, request.translations)
    return {"suggestions": similar_translations}

@app.post("/glossary")
async def generate_glossary(request: TranslationRequest):
    """Extract glossary terms from text."""
    key_terms = extract_key_terms(request.text)
    return {"glossary": key_terms}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
