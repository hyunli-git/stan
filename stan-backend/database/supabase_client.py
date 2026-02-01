"""Supabase client for database operations."""

import os
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()


class SupabaseClient:
    """Supabase database client for STAN backend."""
    
    def __init__(self):
        self.client = self._initialize_client()
    
    def _initialize_client(self) -> Client:
        """Initialize Supabase client."""
        supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_key:
            raise ValueError("Missing Supabase environment variables")

        return create_client(supabase_url, supabase_key)
    
    async def get_custom_prompt(self, user_id: str, stan_id: str) -> Optional[Dict[str, Any]]:
        """Get custom prompt for a specific stan."""
        try:
            response = self.client.table("stan_prompts").select("*").eq(
                "user_id", user_id
            ).eq("stan_id", stan_id).single().execute()
            
            return response.data if response.data else None
        except Exception as e:
            print(f"Error fetching custom prompt: {e}")
            return None
    
    async def save_custom_prompt(self, user_id: str, stan_id: str, prompt_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save or update custom prompt."""
        try:
            # Check if prompt exists
            existing = await self.get_custom_prompt(user_id, stan_id)
            
            data = {
                "user_id": user_id,
                "stan_id": stan_id,
                **prompt_data,
                "updated_at": datetime.now().isoformat()
            }
            
            if existing:
                # Update existing
                response = self.client.table("stan_prompts").update(data).eq(
                    "user_id", user_id
                ).eq("stan_id", stan_id).execute()
            else:
                # Insert new
                data["created_at"] = datetime.now().isoformat()
                response = self.client.table("stan_prompts").insert(data).execute()
            
            return response.data[0] if response.data else {}
        except Exception as e:
            print(f"Error saving custom prompt: {e}")
            raise
    
    async def store_briefing(self, user_id: str, stan_id: str, briefing_content: Dict[str, Any]) -> Dict[str, Any]:
        """Store a briefing in the database."""
        try:
            data = {
                "user_id": user_id,
                "stan_id": stan_id,
                "content": briefing_content.get("content", ""),
                "summary": briefing_content.get("summary", ""),
                "sources": briefing_content.get("sources", []),
                "topics": briefing_content.get("topics", []),
                "created_at": datetime.now().isoformat(),
                "generated_by": "ADK Multi-Agent System"
            }
            
            response = self.client.table("briefings").insert(data).execute()
            return response.data[0] if response.data else {}
        except Exception as e:
            print(f"Error storing briefing: {e}")
            raise
    
    async def store_daily_briefing(self, user_id: str, stan_id: str, briefing_content: Dict[str, Any]) -> Dict[str, Any]:
        """Store a daily briefing."""
        try:
            today = datetime.now().date().isoformat()
            
            # Check if briefing exists for today
            existing = self.client.table("daily_briefings").select("id").eq(
                "user_id", user_id
            ).eq("stan_id", stan_id).eq("date", today).execute()
            
            data = {
                "user_id": user_id,
                "stan_id": stan_id,
                "date": today,
                "content": briefing_content.get("content", ""),
                "summary": briefing_content.get("summary", ""),
                "sources": briefing_content.get("sources", []),
                "topics": briefing_content.get("topics", []),
                "updated_at": datetime.now().isoformat()
            }
            
            if existing.data:
                # Update existing
                response = self.client.table("daily_briefings").update(data).eq(
                    "id", existing.data[0]["id"]
                ).execute()
            else:
                # Insert new
                data["created_at"] = datetime.now().isoformat()
                response = self.client.table("daily_briefings").insert(data).execute()
            
            return response.data[0] if response.data else {}
        except Exception as e:
            print(f"Error storing daily briefing: {e}")
            raise
    
    async def get_user_briefings(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all briefings for a user."""
        try:
            response = self.client.table("briefings").select(
                "*, stans(name, categories)"
            ).eq("user_id", user_id).order("created_at", desc=True).limit(50).execute()
            
            return response.data if response.data else []
        except Exception as e:
            print(f"Error fetching user briefings: {e}")
            return []
    
    async def get_all_users_with_stans(self) -> List[Dict[str, Any]]:
        """Get all users with their stans for batch processing."""
        try:
            # Get all active users
            users_response = self.client.table("profiles").select("id, email").execute()
            users = users_response.data if users_response.data else []
            
            result = []
            for user in users:
                # Get user's stans
                stans_response = self.client.table("stans").select("*").eq(
                    "user_id", user["id"]
                ).execute()
                
                if stans_response.data:
                    # Get user's custom settings
                    settings_response = self.client.table("stan_prompts").select("*").eq(
                        "user_id", user["id"]
                    ).execute()
                    
                    custom_settings = {}
                    if settings_response.data:
                        # Create settings map by stan_id
                        for setting in settings_response.data:
                            custom_settings[setting["stan_id"]] = setting
                    
                    result.append({
                        "id": user["id"],
                        "email": user.get("email"),
                        "stans": stans_response.data,
                        "custom_settings": custom_settings
                    })
            
            return result
        except Exception as e:
            print(f"Error fetching users with stans: {e}")
            return []
    
    async def clear_user_briefings(self, user_id: str, days_old: int = 7) -> bool:
        """Clear old briefings for a user."""
        try:
            cutoff_date = (datetime.now() - timedelta(days=days_old)).isoformat()
            
            # Clear old briefings
            self.client.table("briefings").delete().eq(
                "user_id", user_id
            ).lt("created_at", cutoff_date).execute()
            
            # Clear old daily briefings
            self.client.table("daily_briefings").delete().eq(
                "user_id", user_id
            ).lt("date", cutoff_date).execute()
            
            return True
        except Exception as e:
            print(f"Error clearing user briefings: {e}")
            return False
    
    async def clear_all_briefings(self, days_old: int = 7) -> bool:
        """Clear all old briefings."""
        try:
            cutoff_date = (datetime.now() - timedelta(days=days_old)).isoformat()
            
            # Clear old briefings
            self.client.table("briefings").delete().lt(
                "created_at", cutoff_date
            ).execute()
            
            # Clear old daily briefings
            self.client.table("daily_briefings").delete().lt(
                "date", cutoff_date
            ).execute()
            
            return True
        except Exception as e:
            print(f"Error clearing all briefings: {e}")
            return False
    
    async def get_stan_by_id(self, stan_id: str) -> Optional[Dict[str, Any]]:
        """Get stan details by ID."""
        try:
            response = self.client.table("stans").select("*").eq("id", stan_id).single().execute()
            return response.data if response.data else None
        except Exception as e:
            print(f"Error fetching stan: {e}")
            return None
    
    async def get_user_stans(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all stans for a user."""
        try:
            response = self.client.table("stans").select("*").eq(
                "user_id", user_id
            ).order("priority", desc=True).execute()
            
            return response.data if response.data else []
        except Exception as e:
            print(f"Error fetching user stans: {e}")
            return []