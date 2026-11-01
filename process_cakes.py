import os
from rembg import remove, new_session
from PIL import Image

session = new_session('u2netp')

images = [
    {
        "src": r"C:/Users/acer-/.gemini/antigravity/brain/fb2f8ee4-5619-4ddd-8a6a-2f265b3b9abc/.user_uploaded/media_1793470588400_07fe4c05.jpg",
        "dest": "public/cakes/cake-chocolate.png"
    },
    {
        "src": r"C:/Users/acer-/.gemini/antigravity/brain/fb2f8ee4-5619-4ddd-8a6a-2f265b3b9abc/.user_uploaded/media_1793470643355_4c8916ea.jpg",
        "dest": "public/cakes/cake-strawberry.png"
    },
    {
        "src": r"C:/Users/acer-/.gemini/antigravity/brain/fb2f8ee4-5619-4ddd-8a6a-2f265b3b9abc/.user_uploaded/media_1793470674593_2010b089.png",
        "dest": "public/cakes/cake-mint.png"
    },
    {
        "src": r"C:/Users/acer-/.gemini/antigravity/brain/fb2f8ee4-5619-4ddd-8a6a-2f265b3b9abc/.user_uploaded/media_1793470691622_3918b36e.jpg",
        "dest": "public/cakes/cake-slices.png"
    }
]

os.makedirs("public/cakes", exist_ok=True)

for item in images:
    print(f"Processing {item['dest']}...")
    img = Image.open(item["src"])
    out = remove(img, session=session)
    out.save(item["dest"], "PNG")
    print(f"Saved {item['dest']} successfully.")

print("All 4 cakes processed with transparent background!")
