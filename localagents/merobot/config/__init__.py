"""Configuration module for merobot."""

from merobot.config.loader import load_config, get_config_path
from merobot.config.schema import Config

__all__ = ["Config", "load_config", "get_config_path"]
