"""Domain models for the ClassQuest desktop application."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional


@dataclass(slots=True)
class Badge:
    """A badge awarded to a student for reaching a milestone."""

    badge_id: int
    name: str
    description: str
    svg_icon: str
    awarded_at: datetime


@dataclass(slots=True)
class Reward:
    """A possible XP reward that can be granted to multiple students."""

    reward_id: int
    label: str
    xp_amount: int
    color_role: str = "primary"
    description: Optional[str] = None


@dataclass(slots=True)
class Student:
    """Representation of a student participating in ClassQuest."""

    student_id: int
    display_name: str
    avatar_svg: str
    xp: int = 0
    level: int = 1
    badges: List[Badge] = field(default_factory=list)

    def add_xp(self, amount: int) -> None:
        if amount < 0:
            raise ValueError("XP amount must be non-negative")
        self.xp += amount
        self.level = 1 + self.xp // 100

    def award_badge(self, badge: Badge) -> None:
        self.badges.append(badge)
