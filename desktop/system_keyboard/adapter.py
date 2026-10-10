"""
AirType AI - System Keyboard Adapter Interface
Abstract base class defining how AirType interacts with operating system input queues.
"""

from abc import ABC, abstractmethod


class SystemKeyboardAdapter(ABC):
    """Abstract adapter allowing AirType to type into external apps (Notepad, browser, etc.)."""

    @abstractmethod
    def send_char(self, char: str) -> bool:
        """Injects a single Unicode character (Arabic or English) into the active window."""
        pass

    @abstractmethod
    def send_backspace(self) -> bool:
        """Injects a Backspace key press."""
        pass

    @abstractmethod
    def send_space(self) -> bool:
        """Injects a Space key press."""
        pass

    @abstractmethod
    def send_enter(self) -> bool:
        """Injects an Enter / Return key press."""
        pass

    @abstractmethod
    def emergency_stop(self):
        """Immediately halts input transmission and releases any held keys."""
        pass

    @abstractmethod
    def is_active(self) -> bool:
        """Returns whether external system typing is currently armed/enabled."""
        pass

    @abstractmethod
    def set_active(self, active: bool):
        """Enables or disables system-wide keystroke injection."""
        pass
