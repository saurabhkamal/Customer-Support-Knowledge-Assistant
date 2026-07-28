from neo4j import GraphDatabase

uri = "neo4j+ssc://6b0cab3d.databases.neo4j.io"
driver = GraphDatabase.driver(uri, auth=("6b0cab3d", "DTW6AevGNsBhLfzpZwdvuMCizZbs1ze308kuvLG7DzU"))

try:
    driver.verify_connectivity()
    print("Connection successful")
except Exception as e:
    print("Failed:", e)