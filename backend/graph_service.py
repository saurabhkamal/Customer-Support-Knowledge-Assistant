from graph_database import get_neo4j_driver  # Reuses your existing Neo4j connection setup

def sync_customer(customer_id: int, name: str, email: str):
    driver = get_neo4j_driver()         # get the connection manager
    with driver.session() as session:    # open a session, auto-closes when done
        session.run(
            """
            MERGE (c:Customer {id: $id})    
            SET c.name = $name, c.email = $email  
            """,
            id=customer_id,     # fill in $id
            name=name,          # fill in $name
            email=email           # fill in $email

        )

#MERGE (c:Customer {id: $id})    find/create node by id only (prevents duplicates)
#SET c.name = $name, c.email = $email   -- update its name/email fields


def sync_product(product_id: int, name: str, description: str = None):
    driver = get_neo4j_driver()
    with driver.session() as session:
        session.run(
            """
            MERGE (p:Product {id: $id})
            SET p.name = $name, p.description = $description
            """,
            id=product_id,
            name=name,
            description=description,
        )


def sync_ticket(ticket_id: int, subject: str, status: str, customer_id: int, product_id: int = None):
    driver = get_neo4j_driver()
    with driver.session() as session:
        session.run(
            """
            MERGE (t:Ticket {id: $ticket_id})
            SET t.subject = $subject, t.status = $status
            // find/create the ticket by id, then update its subject/status
            WITH t 
            MATCH (c:Customer {id: $customer_id})
            MERGE (c)-[:RAISED]->(t)
            // carry "t" forward, find the customer, link customer -> ticket via RAISED (no duplicates)
            """,
            ticket_id=ticket_id,
            subject=subject,
            status=status,
            customer_id=customer_id
        )

        if product_id is not None:
            session.run(
                """
                MATCH (t:Ticket {id: $ticket_id})
                MATCH (p:Product {id: $product_id})
                MERGE (t)-[:RELATED_TO]->(p)
                """,
                ticket_id=ticket_id,
                product_id=product_id
            )

            # Find the already-existing ticket and product nodes, then creates RELATED_TO relationship between them 
            # matching the doc's Ticket RELATED_TO Product relationship exactly.

def sync_issue(issue_id: int, title: str, description: str, ticket_id: int):
    driver = get_neo4j_driver()
    with driver.session() as session:
        session.run(
            """
            MERGE (i: Issue {id: $issue_id})
            SET i.title = $title, i.description = $description
            WITH i
            MATCH (t: Ticket {id: $ticket_id})
            MERGE (t)-[:HAS_ISSUE]->(i)
            """,
            issue_id=issue_id,
            title=title,
            description=description,
            ticket_id=ticket_id,
        )

def sync_solution(solution_id: int, description: str, issue_id: int):
    driver = get_neo4j_driver()
    with driver.session() as session:
        session.run(
            """
            MERGE (s:Solution {id: $solution_id})
            SET s.description = $description
            WITH s
            MATCH (i:Issue {id: $issue_id})
            MERGE (i)-[:RESOLVED_BY]->(s)
            """,
            solution_id=solution_id,
            description=description,
            issue_id=issue_id,
        )

def sync_document(document_id: int, title: str, content: str, product_id: int):
    driver = get_neo4j_driver()
    with driver.session() as session:
        session.run(
            """
            MERGE(d:Document {id: $document_id})
            SET d.title = $title, d.content = $content
            WITH d
            MATCH (p: Product {id: $product_id})
            MERGE (p)-[:HAS_DOCUMENT]->(d)
            """,
            document_id=document_id,
            title=title,
            content=content,
            product_id=product_id,
        )