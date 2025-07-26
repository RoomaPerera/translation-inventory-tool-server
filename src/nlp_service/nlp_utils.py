import spacy
from collections import Counter
from typing import List, Dict, Any

# Load the English model, which is appropriate since the source text is English.
try:
    nlp = spacy.load('en_core_web_md')
except OSError:
    print("Downloading 'en_core_web_md' model...")
    from spacy.cli import download
    download('en_core_web_md')
    nlp = spacy.load('en_core_web_md')

def find_similar_translations(new_text: str, existing_translations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Finds and ranks existing translations based on semantic similarity to a new text.
    This version assumes the source text for all translations is similar, even if the
    target language is different, which is ideal for providing context to a translator.

    Args:
        new_text: The source text of the new translation (assumed to be English).
        existing_translations: A list of existing translation objects from the DB.

    Returns:
        A list of up to 5 translation suggestions, sorted by similarity score.
    """
    if not new_text or not existing_translations:
        return []

    # Process the new source text with our English NLP model.
    new_doc = nlp(new_text)

    similarities = []

    for translation in existing_translations:
        # We need to compare against the SOURCE KEY of the existing translations, not the translated text.
        # Let's assume the 'translationKey' holds the English source text.
        existing_source_text = translation.get('translationKey', '')
        
        # This is the actual translated text in another language (e.g., 'Bienvenue...')
        # We will return this, but we won't use it for the comparison.
        final_translated_text = translation.get('translatedText', '')

        if not existing_source_text or not final_translated_text:
            continue
        
        existing_doc = nlp(existing_source_text)
        
        # Calculate similarity between the two English source texts.
        if new_doc.has_vector and existing_doc.has_vector:
            similarity_score = new_doc.similarity(existing_doc)
            
            similarities.append({
                # Return the actual translated text and its metadata
                "translatedText": final_translated_text,
                "language": translation.get("language"),
                "sourceText": existing_source_text,
                "similarity": round(similarity_score, 4)
            })

    # Sort the results by the calculated similarity score.
    similarities.sort(key=lambda x: x['similarity'], reverse=True)

    # Return the top 5 most useful suggestions.
    return similarities[:3]


def extract_key_terms(text: str, top_n: int = 10) -> List[Dict[str, str]]:
    """
    Extracts the most relevant keywords (nouns and proper nouns) from a given text
    to suggest for a glossary. This function remains the same and is correct.
    """
    if not text:
        return []
        
    doc = nlp(text)

    key_terms = [
        token.lemma_.lower() 
        for token in doc 
        if not token.is_stop and not token.is_punct and token.pos_ in ['NOUN', 'PROPN']
    ]
    
    term_counts = Counter(key_terms)
    most_common_terms = term_counts.most_common(top_n)
    glossary_suggestions = [{"term": term, "translation": ""} for term, count in most_common_terms]

    return glossary_suggestions