import asyncio
from sentence_transformers import SentenceTransformer 
from typing import List 


model = SentenceTransformer("all-mpnet-base-v2")


async def get_embeddings(text: str) -> List[float]:
    try : 
        result = await asyncio.to_thread(
            model.encode,
            text,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        return result.tolist()  # Convert numpy array to list
    except Exception as e:
        raise RuntimeError(f"Embedding generation failed: {str(e)}") 
