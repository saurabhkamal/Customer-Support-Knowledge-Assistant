import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def split_into_chunks(text: str, chunk_size: int = 500, overlap: int = 50):

    # empty list to collect the chunks
    chunks = []

    # tracks our current position as we slide through the text
    start = 0

    text_length = len(text)

    while start < text_length:     # While loop keeps repeating this until start reaches the end of the text
        end = start + chunk_size   # calculates where this chunk should stop (500 characters ahead)
        chunk = text[start:end]    # Python's string slicing grabs exactly that piece of text
        chunks.append(chunk)       # saves it to our growing list
        start += chunk_size - overlap  # ?

    return chunks
 

# takes any text, returns its 1536-number embedding.
def generate_embedding(text: str):
    response = client.embeddings.create(
        model = "text-embedding-3-small",
        input = text,
    )
    return response.data[0].embedding
