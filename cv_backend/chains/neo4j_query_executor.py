from langchain_community.graphs import Neo4jGraph
import os
from dotenv import load_dotenv
load_dotenv() 


graph = Neo4jGraph(
    url=os.getenv("NEO4J_URI"),
    username=os.getenv("NEO4J_USER"),
    password=os.getenv("NEO4J_PASSWORD")
)

def run_cypher(cypher: str):
    try:
        return graph.query(cypher)
    except Exception as e:
        return [{"error": str(e)}]
