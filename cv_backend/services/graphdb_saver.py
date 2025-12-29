from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

load_dotenv()
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

def get_driver():
    return driver

def person_exists_in_neo4j(name: str) -> bool:
    with driver.session() as session:
        result = session.run("MATCH (p:Person {name: $name}) RETURN p", name=name)
        return result.single() is not None


def delete_person_from_neo4j(name: str):
    with driver.session() as session:
        session.run("MATCH (p:Person {name: $name}) DETACH DELETE p", name=name)

async def save_to_neo4j(json_data: dict):
    
    with driver.session() as session:
        # Person
        session.execute_write(lambda tx: tx.run("""
            MERGE (p:Person {name: $name})
            SET p.email = $email,
                p.phone = $phone,
                p.github = $github,
                p.linkedin = $linkedin
        """, name=json_data["name"], email=json_data["contact"]["email"],
             phone=json_data["contact"]["phone"],
             github=json_data["contact"].get("github"),
             linkedin=json_data["contact"].get("linkedin")))

        # Education
        for edu in json_data["education"]:
            session.execute_write(lambda tx: tx.run("""
                MATCH (p:Person {name: $name})
                MERGE (e:Education {institution: $institution, degree: $degree})
                SET e.location = $location, e.dates = $dates, e.courses = $courses
                MERGE (p)-[:HAS_EDUCATION]->(e)
            """, name=json_data["name"], institution=edu["institution"],
                 degree=edu["degree"], location=edu["location"],
                 dates=edu["dates"], courses=edu.get("courses", "")))

        # Work Experience
        for work in json_data["work_experience"]:
            session.execute_write(lambda tx: tx.run("""
                MATCH (p:Person {name: $name})
                MERGE (o:Organization {name: $organization})
                SET o.location = $location
                MERGE (w:Position {position: $position, organization: $organization})
                SET w.dates = $dates, w.achievements = $achievements
                MERGE (p)-[:HAS_EXPERIENCE]->(w)
                MERGE (w)-[:AT_ORGANIZATION]->(o)
            """, name=json_data["name"], organization=work["organization"],
                 location=work["location"], position=work["position"],
                 dates=work["dates"], achievements=work["achievements"]))

        # Projects
        for pr in json_data["projects"]:
            session.execute_write(lambda tx: tx.run("""
                MATCH (p:Person {name: $name})
                MERGE (pr:Project {name: $project_name})
                SET pr.description = $description, pr.link = $link
                MERGE (p)-[:HAS_PROJECT]->(pr)
            """, name=json_data["name"], project_name=pr["name"],
                 description=pr["description"], link=pr.get("link")))

        # Skills
        for skill in json_data["skills"]:
            session.execute_write(lambda tx: tx.run("""
                MATCH (p:Person {name: $name})
                MERGE (s:Skill {name: $skill})
                MERGE (p)-[:HAS_SKILL]->(s)
            """, name=json_data["name"], skill=skill))

        # Certifications
        for cert in json_data["certifications"]:
            session.execute_write(lambda tx: tx.run("""
                MATCH (p:Person {name: $name})
                MERGE (c:Certification {name: $cert})
                MERGE (p)-[:HAS_CERTIFICATION]->(c)
            """, name=json_data["name"], cert=cert))

        # Activities
        for act in json_data["activities"]:
            session.execute_write(lambda tx: tx.run("""
                MATCH (p:Person {name: $name})
                MERGE (a:Activity {title: $title})
                SET a.role = $role, a.dates = $dates
                MERGE (p)-[:HAS_ACTIVITY]->(a)
            """, name=json_data["name"], title=act["title"],
                 role=act["role"], dates=act.get("dates")))
        
                # References
        for ref in json_data.get("references", []):
            session.execute_write(lambda tx: tx.run("""
                MATCH (p:Person {name: $name})
                MERGE (r:Reference {name: $ref_name, company: $company})
                SET r.title = $title,
                    r.email = $email,
                    r.phone = $phone
                MERGE (p)-[:HAS_REFERENCE]->(r)
            """, name=json_data["name"],
                 ref_name=ref["name"],
                 title=ref["title"],
                 company=ref["company"],
                 email=ref.get("email"),
                 phone=ref.get("phone")))




        
