import spacy

# Load the NLP model
nlp = spacy.load('en_core_web_md')

def find_similar_translations(new_text, translations):
    """Finds similar translations using semantic similarity and returns formatted output."""
    new_doc = nlp(new_text)
    similarities = []

    for translation in translations:
        translated_text = translation.get('translatedText', '')
        translation_doc = nlp(translated_text)
        similarity = new_doc.similarity(translation_doc)
        similarities.append((translated_text, similarity))

    # Sort and return top 5 in expected format
    similarities.sort(key=lambda x: x[1], reverse=True)
    return [{"translatedText": s[0]} for s in similarities[:5]]

def extract_key_terms(text):
    """Extracts important keywords from text and returns glossary-style structure."""
    doc = nlp(text)
    key_terms = list(set(token.text for token in doc if token.pos_ in ['NOUN', 'VERB', 'ADJ']))
    return [{"term": term, "translation": ""} for term in key_terms]
