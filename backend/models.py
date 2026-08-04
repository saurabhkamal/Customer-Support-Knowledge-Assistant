from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func  # func gives access to built-in SQL functions - func.now() to auto generate the current timestamp when a row is created.
from sqlalchemy.orm import relationship
from database import Base  # already created in database.py; every table model must inherit from this - its what register the class with SQLAlchemy as a real table definiton
from pgvector.sqlalchemy import Vector
import secrets

class Customer(Base):    # Customer class inheriting from base, making it a model - table blueprint
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, nullable=False, default="open")

    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("Customer")
    product = relationship("Product")


class Issue(Base):
    __tablename__ = "issues"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    embedding = Column(Vector(1536))  
    # Add the embedding column to the Issue model
    # so it can later be compared for similarity against a user's question
    created_at = Column(DateTime(timezone=True), server_default=func.now()) # Timestamp auto-filled by Postgres
    ticket = relationship("Ticket")   # Lets you write issue.ticket in Python to get the full parent Ticket object

class Solution(Base):
    __tablename__ = "solutions"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, nullable=False)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    issue = relationship("Issue")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)

    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    chunk_text = Column(String, nullable=False)
    embedding = Column(Vector(1536))

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    document = relationship("Document")


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False, index=True)
    label = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())



    

