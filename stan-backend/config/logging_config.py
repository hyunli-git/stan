"""Structured logging configuration using structlog.

Provides JSON logging for production and human-readable logs for development.
"""

import logging
import sys
import structlog
from typing import Any


def configure_logging(environment: str = "development"):
    """Configure structured logging for the application.

    Args:
        environment: "development" or "production"
    """
    # Configure standard logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=logging.INFO,
    )

    # Shared processors for all environments
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
    ]

    if environment == "production":
        # JSON logging for production (easy parsing by log aggregators)
        processors = shared_processors + [
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer()
        ]
    else:
        # Human-readable logging for development
        processors = shared_processors + [
            structlog.processors.format_exc_info,
            structlog.dev.ConsoleRenderer(colors=True)
        ]

    # Configure structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str = None) -> Any:
    """Get a configured logger.

    Args:
        name: Logger name (usually __name__)

    Returns:
        Configured structlog logger
    """
    return structlog.get_logger(name)


# Pre-configured loggers for common use cases
def log_api_request(
    method: str,
    path: str,
    user_id: str = None,
    status_code: int = None,
    duration_ms: float = None
):
    """Log API request with standard fields.

    Args:
        method: HTTP method
        path: Request path
        user_id: User ID if authenticated
        status_code: HTTP status code
        duration_ms: Request duration in milliseconds
    """
    logger = get_logger("api")
    logger.info(
        "api_request",
        method=method,
        path=path,
        user_id=user_id,
        status_code=status_code,
        duration_ms=duration_ms
    )


def log_error(
    error_type: str,
    error_message: str,
    context: dict = None,
    exc_info=None
):
    """Log error with context.

    Args:
        error_type: Type of error (e.g., "database_error", "api_error")
        error_message: Error message
        context: Additional context dict
        exc_info: Exception info for stack trace
    """
    logger = get_logger("error")
    logger.error(
        error_type,
        error_message=error_message,
        context=context or {},
        exc_info=exc_info
    )


def log_briefing_generation(
    stan_name: str,
    user_id: str,
    duration_ms: float,
    agent_type: str,
    cost_usd: float,
    success: bool = True,
    error: str = None
):
    """Log briefing generation event.

    Args:
        stan_name: Name of the stan
        user_id: User ID
        duration_ms: Generation duration in milliseconds
        agent_type: Type of agent used
        cost_usd: Estimated cost in USD
        success: Whether generation succeeded
        error: Error message if failed
    """
    logger = get_logger("briefing")
    logger.info(
        "briefing_generated",
        stan_name=stan_name,
        user_id=user_id,
        duration_ms=duration_ms,
        agent_type=agent_type,
        cost_usd=cost_usd,
        success=success,
        error=error
    )


def log_cache_operation(
    operation: str,
    key: str,
    hit: bool = None,
    ttl: int = None
):
    """Log cache operation.

    Args:
        operation: Operation type (get, set, delete)
        key: Cache key
        hit: Whether cache hit occurred (for get operations)
        ttl: TTL in seconds (for set operations)
    """
    logger = get_logger("cache")
    logger.info(
        "cache_operation",
        operation=operation,
        key=key,
        hit=hit,
        ttl=ttl
    )
