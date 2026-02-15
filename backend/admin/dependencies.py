from fastapi import Depends, HTTPException, status
from database.models import User
from auth.dependencies import get_current_user


def require_role(*allowed_roles: str):
    """FastAPI dependency factory – returns a dependency that checks the
    current user has one of the allowed roles.

    Usage:
        @router.get("/admin/something", dependencies=[Depends(require_role("admin"))])
        def admin_only_endpoint(): ...

    Or as a direct dependency:
        def endpoint(user: User = Depends(require_role("admin"))): ...
    """

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(allowed_roles)}",
            )
        return current_user

    return role_checker
