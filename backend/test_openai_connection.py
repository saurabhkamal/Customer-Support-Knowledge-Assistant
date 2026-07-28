import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

try:
    response = client.embeddings.create(
        model = "text-embedding-3-small",
        input = "How can I resolve login failure"
    )

    embedding = response.data[0].embedding

    print("OpenAI connection successful")
    print("Embedding length:", len(embedding))
    #print("\nembedding")
    print("First 5 numbers", embedding[:10])

except Exception as e:
    print("OpenAI connection failed:",e)