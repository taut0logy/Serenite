from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
from typing import Optional, Dict, Any
from config import settings
from utils.logger import logger

security = HTTPBearer(auto_error=False)  # Don't auto-error, handle manually

class AuthMiddleware:


    async def verify_session(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify session using GraphQL verifySession mutation
        """
        query = """
        mutation VerifySession($token: String!) {
            verifySession(token: $token) {
                valid
                user {
                    id
                    email
                    verified
                    role
                    profile {
                        firstName
                        lastName
                        bio
                        dob
                        avatarUrl
                    }
                }
            }
        }
        """
        
        variables = {"token": token}
        
        payload = {
            "query": query,
            "variables": variables
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    settings.GRAPHQL_ENDPOINT,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=settings.AUTH_TIMEOUT
                )
                
                if response.status_code != 200:
                    if settings.DEBUG:
                        logger.error(f"GraphQL request failed with status {response.status_code}: {response.text}")
                    return None
                
                data = response.json()
                
                if "errors" in data:
                    if settings.DEBUG:
                        logger.error(f"GraphQL errors: {data['errors']}")
                    return None
                
                verify_result = data.get("data", {}).get("verifySession")
                
                if verify_result and verify_result.get("valid"):
                    return verify_result.get("user")
                
                return None
                
        except httpx.TimeoutException:
            logger.error("GraphQL request timeout")
            return None
        except Exception as e:
            if settings.DEBUG:
                logger.error(f"Error verifying session: {str(e)}")
            return None

auth_middleware = AuthMiddleware()

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict[str, Any]:
    """
    Dependency to get current authenticated user
    Supports both Bearer token and NextAuth session token
    """
    token = None
    
    # Try to get token from Authorization header first
    if credentials:
        token = credentials.credentials
    
    # Also try getting it from cookies if that's how your frontend sends it
    if not token:
        token = request.cookies.get("authjs.session-token") or request.cookies.get("__Secure-authjs.session-token")

    if not token:
        raise HTTPException(
            status_code=401,
            detail="No authentication token provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await auth_middleware.verify_session(token)
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired session token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.get("verified"):
        raise HTTPException(
            status_code=403,
            detail="User account not verified",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user

async def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Dependency that requires admin role
    """
    if current_user.get("role") != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    
    return current_user

async def require_role(role: str, current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Dependency that requires specific user role
    """
    if current_user.get("role") != role:
        raise HTTPException(
            status_code=403,
            detail="Insufficient permissions"
        )
    
    return current_user
