#!/usr/bin/env python3
"""
Quick script to test Redis Cloud connection
Run this to verify your Redis setup is working
"""

import os
import redis
from dotenv import load_dotenv

load_dotenv()

def test_redis_connection():
    redis_url = os.getenv("REDIS_URL")
    
    if not redis_url:
        print("❌ ERROR: REDIS_URL not found in .env file")
        return False
    
    print(f"🔗 Connecting to Redis...")
    print(f"   URL: {redis_url.split('@')[0]}@***")  # Hide password
    
    try:
        r = redis.Redis.from_url(
            redis_url,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True
        )
        
        # Test ping
        result = r.ping()
        if result:
            print("✅ Redis connection successful!")
            
            # Test write/read
            r.setex("test_key", 10, "test_value")
            value = r.get("test_key")
            if value and value.decode() == "test_value":
                print("✅ Redis read/write test passed!")
                r.delete("test_key")
                print("✅ Test key cleaned up")
                return True
            else:
                print("❌ Redis read/write test failed")
                return False
        else:
            print("❌ Redis ping failed")
            return False
            
    except redis.ConnectionError as e:
        print(f"❌ Connection error: {e}")
        print("\n💡 Troubleshooting:")
        print("   1. Check your REDIS_URL in .env file")
        print("   2. Verify Redis Cloud database is active")
        print("   3. Check firewall/network settings")
        return False
    except redis.AuthenticationError as e:
        print(f"❌ Authentication error: {e}")
        print("\n💡 Troubleshooting:")
        print("   1. Check your password in REDIS_URL")
        print("   2. Verify password is correct in Redis Cloud dashboard")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("Redis Cloud Connection Test")
    print("=" * 50)
    print()
    
    success = test_redis_connection()
    
    print()
    print("=" * 50)
    if success:
        print("✅ All tests passed! Redis is ready to use.")
    else:
        print("❌ Tests failed. Please check your configuration.")
    print("=" * 50)


