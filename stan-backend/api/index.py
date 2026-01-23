from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World", "status": "OK"}

@app.get("/api/health")
def health():
    return {"status": "healthy"}

# Vercel will automatically handle this
handler = app
