"""
Initialize Neo4j database with required constraints and indexes
Run this script after creating a new Neo4j instance
"""
from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

def init_neo4j_database():
    """Create constraints and indexes for the CV database schema"""

    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    constraints_and_indexes = [
        # Constraints for uniqueness (helps with MERGE operations)
        "CREATE CONSTRAINT person_name IF NOT EXISTS FOR (p:Person) REQUIRE p.name IS UNIQUE",
        "CREATE CONSTRAINT skill_name IF NOT EXISTS FOR (s:Skill) REQUIRE s.name IS UNIQUE",
        "CREATE CONSTRAINT certification_name IF NOT EXISTS FOR (c:Certification) REQUIRE c.name IS UNIQUE",
        "CREATE CONSTRAINT organization_name IF NOT EXISTS FOR (o:Organization) REQUIRE o.name IS UNIQUE",

        # Indexes for faster lookups
        "CREATE INDEX person_email IF NOT EXISTS FOR (p:Person) ON (p.email)",
        "CREATE INDEX person_phone IF NOT EXISTS FOR (p:Person) ON (p.phone)",
        "CREATE INDEX education_institution IF NOT EXISTS FOR (e:Education) ON (e.institution)",
        "CREATE INDEX project_name IF NOT EXISTS FOR (pr:Project) ON (pr.name)",
        "CREATE INDEX activity_title IF NOT EXISTS FOR (a:Activity) ON (a.title)",
        "CREATE INDEX position_position IF NOT EXISTS FOR (w:Position) ON (w.position)",
        "CREATE INDEX reference_name IF NOT EXISTS FOR (r:Reference) ON (r.name)",
    ]

    try:
        with driver.session() as session:
            print("Initializing Neo4j database...")
            print("-" * 50)

            for query in constraints_and_indexes:
                try:
                    session.run(query)
                    # Extract the name from the query for better logging
                    if "CONSTRAINT" in query:
                        constraint_name = query.split()[2]
                        print(f"✓ Created constraint: {constraint_name}")
                    elif "INDEX" in query:
                        index_name = query.split()[2]
                        print(f"✓ Created index: {index_name}")
                except Exception as e:
                    # If constraint/index already exists, that's okay
                    if "already exists" in str(e).lower() or "equivalent" in str(e).lower():
                        print(f"⚠ Already exists (skipping): {query.split()[2]}")
                    else:
                        print(f"✗ Error: {e}")
                        print(f"  Query: {query}")

            print("-" * 50)
            print("Neo4j database initialization complete!")

            # Verify setup
            print("\nVerifying setup...")
            result = session.run("SHOW CONSTRAINTS")
            constraints = [record["name"] for record in result]
            print(f"Total constraints: {len(constraints)}")

            result = session.run("SHOW INDEXES")
            indexes = [record["name"] for record in result]
            print(f"Total indexes: {len(indexes)}")

            print("\n✓ Database is ready for CV uploads!")

    except Exception as e:
        print(f"Error initializing Neo4j: {e}")
        raise
    finally:
        driver.close()

if __name__ == "__main__":
    try:
        init_neo4j_database()
    except Exception as e:
        print(f"\nFailed to initialize Neo4j database: {e}")
        print("\nPlease check:")
        print("1. Neo4j instance is running")
        print("2. Connection credentials in .env are correct")
        print("3. NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD are set")
        exit(1)
