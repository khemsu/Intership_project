import asyncio
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor()

async def run_in_thread(func , *args , **kwargs):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(executor ,func , *args , **kwargs)
