def main() -> None:
    """Start the local API using the uv-managed environment."""
    import uvicorn

    uvicorn.run("rumbo.api:app", host="127.0.0.1", port=8000)
