import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone, timedelta
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def seed_database():
    print("Starting database seeding...")
    
    await db.users.delete_many({})
    await db.products.delete_many({})
    await db.expense_categories.delete_many({})
    await db.income_entries.delete_many({})
    await db.expense_entries.delete_many({})
    
    # Create main user account
    main_user = {
        "id": "joel-user",
        "email": "joeljalapitjr@gmail.com",
        "password": "joelpogi",
        "name": "Joel Jalapit Jr",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(main_user)
    print("Created main user: joeljalapitjr@gmail.com")
    
    # Create demo user as backup
    demo_user = {
        "id": "demo-user",
        "email": "demo@finance.com",
        "password": "demo123",
        "name": "Demo User",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(demo_user)
    print("Created demo user: demo@finance.com")
    
    default_products = [
        "Motionarray",
        "Adobe All Apps",
        "Epidemic Sound",
        "ChatGPT Plus",
        "CapCut Pro",
        "Higgsfield",
        "Storyblocks",
        "Envato",
        "Musicbed",
        "Artlist",
        "Artlist AI Creds",
        "Freepik",
        "MisterHorse",
        "Final Cut Asset",
        "Fish Audio",
        "Pixieset",
        "AI Service",
        "DaVinci Key Commission"
    ]
    
    for product_name in default_products:
        product = {
            "id": str(uuid.uuid4()),
            "name": product_name,
            "description": "",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.products.insert_one(product)
    
    print(f"Created {len(default_products)} products")
    
    default_categories = [
        "Food",
        "Gas",
        "Offering",
        "Utilities",
        "Grocery",
        "Personal",
        "Transportation",
        "Tools",
        "Load",
        "Medical",
        "Miscellaneous"
    ]
    
    for category_name in default_categories:
        category = {
            "id": str(uuid.uuid4()),
            "name": category_name,
            "description": "",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.expense_categories.insert_one(category)
    
    print(f"Created {len(default_categories)} expense categories")
    
    customer_names = [
        "Gian Mendoza",
        "Rosalyn Caldito",
        "Maria Santos",
        "John Reyes",
        "Anna Cruz",
        "Pedro Garcia",
        "Lisa Tan",
        "Mark Villanueva",
        "Sarah Aquino",
        "David Ramos"
    ]
    
    base_date = datetime(2025, 3, 1)
    
    for day in range(1, 26):
        current_date = base_date + timedelta(days=day-1)
        date_str = current_date.strftime("%Y-%m-%d")
        day_name = current_date.strftime("%A")
        
        num_income = random.randint(1, 4)
        for _ in range(num_income):
            product = random.choice(default_products)
            customer = random.choice(customer_names)
            amount = random.choice([489, 849, 1200, 1500, 699, 999])
            
            income_entry = {
                "id": str(uuid.uuid4()),
                "user_id": "demo-user",
                "date": date_str,
                "day": day_name,
                "amount": amount,
                "product_name": product,
                "person_name": customer,
                "notes": "",
                "payment_status": random.choice(["Paid", "Paid", "Paid", "Pending"]),
                "reference_number": f"INV-{random.randint(1000, 9999)}",
                "created_at": current_date.isoformat(),
                "updated_at": current_date.isoformat()
            }
            await db.income_entries.insert_one(income_entry)
        
        num_expenses = random.randint(2, 5)
        for _ in range(num_expenses):
            category = random.choice(default_categories)
            
            descriptions = {
                "Food": ["Lunch", "Dinner", "Snacks", "Breakfast"],
                "Gas": ["Gas refill", "Fuel"],
                "Offering": ["Church offering", "Donation"],
                "Utilities": ["Electric bill", "Water bill", "Internet"],
                "Grocery": ["Grocery shopping", "Supermarket"],
                "Personal": ["Haircut", "Clothes", "Toiletries"],
                "Transportation": ["Taxi fare", "Grab ride", "Bus fare"],
                "Tools": ["Software subscription", "Equipment"],
                "Load": ["Mobile load", "Prepaid load"],
                "Medical": ["Medicine", "Doctor visit"],
                "Miscellaneous": ["Others", "Miscellaneous expense"]
            }
            
            description = random.choice(descriptions.get(category, ["Expense"]))
            amount = random.randint(50, 1500)
            
            expense_entry = {
                "id": str(uuid.uuid4()),
                "user_id": "demo-user",
                "date": date_str,
                "day": day_name,
                "amount": amount,
                "description": description,
                "category_name": category,
                "notes": "",
                "payment_method": random.choice(["Cash", "GCash", "Card"]),
                "reference_number": "",
                "created_at": current_date.isoformat(),
                "updated_at": current_date.isoformat()
            }
            await db.expense_entries.insert_one(expense_entry)
    
    income_count = await db.income_entries.count_documents({})
    expense_count = await db.expense_entries.count_documents({})
    
    print(f"Created {income_count} income entries for March 2025")
    print(f"Created {expense_count} expense entries for March 2025")
    print("Database seeding completed!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
