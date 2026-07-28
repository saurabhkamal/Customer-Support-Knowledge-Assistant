from graph_database import get_neo4j_driver

driver = get_neo4j_driver()

try:
    driver.verify_connectivity()
    print("Neo4j connection successful")
except Exception as e:
    print("Neo4j conncection failed:", e)