"""
Generate Postman collection from FastAPI OpenAPI schema
Run: python generate_postman_collection.py
"""
import json
import httpx

# Configuration
API_BASE_URL = "http://localhost:8000"
OUTPUT_FILE = "cv_backend_postman_collection.json"

def fetch_openapi_schema():
    """Fetch OpenAPI schema from running FastAPI app"""
    try:
        response = httpx.get(f"{API_BASE_URL}/openapi.json", timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching schema: {e}")
        print("\nMake sure your FastAPI server is running:")
        print("  uvicorn main:app --reload")
        return None

def convert_to_postman(openapi_schema):
    """Convert OpenAPI schema to Postman collection format"""

    collection = {
        "info": {
            "name": "CV Backend API",
            "description": "CV Parser and Management System",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": [],
        "variable": [
            {
                "key": "baseUrl",
                "value": API_BASE_URL,
                "type": "string"
            }
        ]
    }

    paths = openapi_schema.get("paths", {})

    for path, methods in paths.items():
        for method, details in methods.items():
            if method.lower() in ["get", "post", "put", "delete", "patch"]:
                item = {
                    "name": details.get("summary", path),
                    "request": {
                        "method": method.upper(),
                        "header": [],
                        "url": {
                            "raw": "{{baseUrl}}" + path,
                            "host": ["{{baseUrl}}"],
                            "path": path.strip("/").split("/")
                        }
                    }
                }

                # Add description
                if "description" in details:
                    item["request"]["description"] = details["description"]

                # Add request body for POST/PUT/PATCH
                if method.lower() in ["post", "put", "patch"]:
                    if "requestBody" in details:
                        content = details["requestBody"].get("content", {})
                        if "application/json" in content:
                            item["request"]["header"].append({
                                "key": "Content-Type",
                                "value": "application/json"
                            })

                            schema = content["application/json"].get("schema", {})
                            # Add example body
                            item["request"]["body"] = {
                                "mode": "raw",
                                "raw": json.dumps(get_example_from_schema(schema), indent=2),
                                "options": {
                                    "raw": {
                                        "language": "json"
                                    }
                                }
                            }
                        elif "multipart/form-data" in content:
                            item["request"]["body"] = {
                                "mode": "formdata",
                                "formdata": []
                            }

                # Add query parameters
                if "parameters" in details:
                    query_params = []
                    for param in details["parameters"]:
                        if param.get("in") == "query":
                            query_params.append({
                                "key": param["name"],
                                "value": "",
                                "description": param.get("description", ""),
                                "disabled": not param.get("required", False)
                            })

                    if query_params:
                        item["request"]["url"]["query"] = query_params

                collection["item"].append(item)

    return collection

def get_example_from_schema(schema):
    """Generate example JSON from schema"""
    if "example" in schema:
        return schema["example"]

    if "$ref" in schema:
        # Reference to components/schemas
        return {}

    properties = schema.get("properties", {})
    example = {}

    for prop, prop_schema in properties.items():
        prop_type = prop_schema.get("type", "string")

        if prop_type == "string":
            example[prop] = prop_schema.get("example", "")
        elif prop_type == "integer":
            example[prop] = 0
        elif prop_type == "boolean":
            example[prop] = False
        elif prop_type == "array":
            example[prop] = []
        elif prop_type == "object":
            example[prop] = {}

    return example

def main():
    print("Fetching OpenAPI schema from FastAPI app...")
    openapi_schema = fetch_openapi_schema()

    if not openapi_schema:
        return

    print("Converting to Postman collection format...")
    postman_collection = convert_to_postman(openapi_schema)

    print(f"Writing to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, "w") as f:
        json.dump(postman_collection, f, indent=2)

    print(f"\nSuccess! Postman collection saved to: {OUTPUT_FILE}")
    print("\nTo use in Postman:")
    print("1. Open Postman")
    print("2. Click 'Import'")
    print(f"3. Select the file: {OUTPUT_FILE}")
    print("4. Your collection will be ready to use!")

if __name__ == "__main__":
    main()
