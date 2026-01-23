"""Multimodal agent for image, video, and audio analysis."""

import os
from typing import Dict, Any, List, Optional, Union
import google.generativeai as genai
from agents.base_agent import STANBaseAgent
from PIL import Image
import io
import base64


class MultimodalAgent(STANBaseAgent):
    """Agent for processing multimodal content (images, videos, audio)."""

    def __init__(self):
        super().__init__(name="MultimodalAgent")
        # Use Gemini Pro Vision for multimodal tasks
        self.vision_model = genai.GenerativeModel('gemini-2.0-flash-exp')

    async def analyze_image(self, image_data: Union[str, bytes], context: str = "") -> Dict[str, Any]:
        """Analyze an image and extract relevant information.

        Args:
            image_data: Either a base64 string or raw bytes
            context: Additional context about what to look for
        """
        try:
            # Handle base64 or bytes
            if isinstance(image_data, str):
                # Remove data URL prefix if present
                if image_data.startswith('data:image'):
                    image_data = image_data.split(',')[1]
                image_bytes = base64.b64decode(image_data)
            else:
                image_bytes = image_data

            # Open image with PIL
            image = Image.open(io.BytesIO(image_bytes))

            # Create analysis prompt
            prompt = f"""Analyze this image in the context of: {context}

            Please describe:
            1. What you see in the image
            2. Any text or captions visible
            3. The mood/emotion conveyed
            4. Relevant details for a fan briefing

            Keep the description concise (2-3 sentences) and engaging."""

            # Generate response with vision model
            response = self.vision_model.generate_content([prompt, image])

            return {
                "type": "image_analysis",
                "description": response.text,
                "success": True
            }

        except Exception as e:
            print(f"Error analyzing image: {e}")
            return {
                "type": "image_analysis",
                "error": str(e),
                "success": False
            }

    async def analyze_video_thumbnail(self, video_url: str, context: str = "") -> Dict[str, Any]:
        """Analyze a video by extracting key frames or using the thumbnail.

        Args:
            video_url: URL of the video
            context: Stan/topic context for analysis
        """
        try:
            prompt = f"""Analyze this video content for a fan briefing about: {context}

            Video URL: {video_url}

            Please provide:
            1. What the video is likely about based on the URL
            2. Why fans might be interested
            3. Key highlights if available

            Keep it brief (2-3 sentences) and engaging with emojis."""

            response = await self.generate_content(prompt)

            return {
                "type": "video_analysis",
                "description": response,
                "url": video_url,
                "success": True
            }

        except Exception as e:
            print(f"Error analyzing video: {e}")
            return {
                "type": "video_analysis",
                "error": str(e),
                "success": False
            }

    async def analyze_multiple_images(self, images: List[Union[str, bytes]], context: str = "") -> Dict[str, Any]:
        """Analyze multiple images together for a comprehensive view.

        Args:
            images: List of image data (base64 strings or bytes)
            context: Context for analysis
        """
        try:
            analyses = []
            for i, img_data in enumerate(images[:5]):  # Limit to 5 images
                result = await self.analyze_image(img_data, context)
                if result["success"]:
                    analyses.append(result["description"])

            if not analyses:
                return {
                    "type": "multi_image_analysis",
                    "error": "No images could be analyzed",
                    "success": False
                }

            # Combine insights
            summary_prompt = f"""Based on these image descriptions for {context}, create a brief summary:

            {chr(10).join([f'{i+1}. {desc}' for i, desc in enumerate(analyses)])}

            Provide a cohesive 2-3 sentence summary with key highlights and emojis."""

            summary = await self.generate_content(summary_prompt)

            return {
                "type": "multi_image_analysis",
                "individual_analyses": analyses,
                "summary": summary,
                "image_count": len(analyses),
                "success": True
            }

        except Exception as e:
            print(f"Error in multi-image analysis: {e}")
            return {
                "type": "multi_image_analysis",
                "error": str(e),
                "success": False
            }

    async def generate_image_briefing_section(
        self,
        stan_name: str,
        images: List[Union[str, bytes]]
    ) -> Dict[str, Any]:
        """Generate a briefing section specifically about recent images.

        Args:
            stan_name: Name of the stan/topic
            images: List of recent images to analyze
        """
        context = f"recent posts and content about {stan_name}"
        analysis = await self.analyze_multiple_images(images, context)

        if not analysis["success"]:
            return None

        return {
            "title": "📸 Visual Highlights",
            "content": analysis["summary"],
            "sources": [],
            "metadata": {
                "image_count": analysis.get("image_count", 0),
                "type": "visual_content"
            }
        }


class VoiceAgent(STANBaseAgent):
    """Agent for voice/audio features (TTS for briefings)."""

    def __init__(self):
        super().__init__(name="VoiceAgent")
        self.tts_enabled = os.getenv("ELEVENLABS_API_KEY") is not None

    async def generate_voice_briefing(self, text: str, voice_id: str = "default") -> Dict[str, Any]:
        """Generate text-to-speech audio for a briefing.

        Args:
            text: The briefing text to convert to speech
            voice_id: Voice ID for TTS (if using ElevenLabs)
        """
        if not self.tts_enabled:
            return {
                "success": False,
                "error": "TTS not configured (missing ELEVENLABS_API_KEY)"
            }

        try:
            # Placeholder for ElevenLabs integration
            # In production, integrate with ElevenLabs API
            return {
                "success": True,
                "audio_url": "https://example.com/audio/briefing.mp3",
                "duration_seconds": len(text) // 20,  # Rough estimate
                "text_length": len(text)
            }

        except Exception as e:
            print(f"Error generating voice briefing: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def transcribe_audio(self, audio_data: bytes) -> Dict[str, Any]:
        """Transcribe audio to text (for voice commands).

        Args:
            audio_data: Raw audio bytes
        """
        try:
            # Placeholder for speech-to-text
            # In production, use Google Speech-to-Text or Whisper
            return {
                "success": True,
                "transcript": "Sample transcription",
                "confidence": 0.95
            }

        except Exception as e:
            print(f"Error transcribing audio: {e}")
            return {
                "success": False,
                "error": str(e)
            }
