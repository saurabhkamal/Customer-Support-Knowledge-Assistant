from sqlalchemy import inspect
from database import engine

inspector = inspect(engine)
tables = inspector.get_table_names()
print("Tables in database:", tables)  

if "customers" in tables:
    columns = inspector.get_columns("customers")
    print("\n Columns in 'customers':")
    for col in columns:
        print(f" - {col['name']} ({col['type']})")