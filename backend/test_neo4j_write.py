# Creating first nodes and relationships in Python

from graph_database import get_neo4j_driver

driver = get_neo4j_driver()

with driver.session() as session:
    session.run(
        """
        MERGE (c:Customer {id: 1, name: $name, email: $email})
        MERGE (t:ticket {id: 1, subject: $subject, status: $status})
        MERGE (c)-[:RAISED]->(t)
        """,
        name="Saurabh Kamal",
        email="saurabh@example.com",
        subject="Login failure",
        status="open"
    )

print("Nodes and relationship created successfully")

