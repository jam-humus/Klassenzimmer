"""SQLite-backed data store for the ClassQuest desktop UI."""
from __future__ import annotations

import sqlite3
from contextlib import closing
from datetime import datetime
from pathlib import Path
from typing import Iterable, List, Optional

from .models import Badge, Reward, Student


class DataStore:
    """High-level storage facade around a SQLite database."""

    def __init__(self, db_path: str | Path = "classquest.db") -> None:
        self.db_path = Path(db_path)
        self._connection = sqlite3.connect(self.db_path)
        self._connection.row_factory = sqlite3.Row
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        with closing(self._connection.cursor()) as cur:
            cur.executescript(
                """
                CREATE TABLE IF NOT EXISTS students (
                    student_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    display_name TEXT NOT NULL,
                    avatar_svg TEXT NOT NULL,
                    xp INTEGER NOT NULL DEFAULT 0,
                    level INTEGER NOT NULL DEFAULT 1
                );

                CREATE TABLE IF NOT EXISTS badges (
                    badge_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    svg_icon TEXT NOT NULL,
                    awarded_at TEXT NOT NULL,
                    FOREIGN KEY(student_id) REFERENCES students(student_id)
                );

                CREATE TABLE IF NOT EXISTS rewards (
                    reward_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    label TEXT NOT NULL,
                    xp_amount INTEGER NOT NULL,
                    color_role TEXT NOT NULL,
                    description TEXT
                );
                """
            )
            self._connection.commit()

    # ------------------------------------------------------------------
    # Student helpers
    # ------------------------------------------------------------------
    def add_student(self, display_name: str, avatar_svg: str) -> Student:
        with closing(self._connection.cursor()) as cur:
            cur.execute(
                "INSERT INTO students(display_name, avatar_svg, xp, level) VALUES (?, ?, 0, 1)",
                (display_name, avatar_svg),
            )
            student_id = cur.lastrowid
            self._connection.commit()
        return Student(student_id=student_id, display_name=display_name, avatar_svg=avatar_svg)

    def update_student(self, student: Student) -> None:
        with closing(self._connection.cursor()) as cur:
            cur.execute(
                "UPDATE students SET display_name=?, avatar_svg=?, xp=?, level=? WHERE student_id=?",
                (student.display_name, student.avatar_svg, student.xp, student.level, student.student_id),
            )
            self._connection.commit()

    def grant_xp(self, student_id: int, amount: int) -> Student:
        student = self.get_student(student_id)
        if student is None:
            raise ValueError(f"Student {student_id} does not exist")
        student.add_xp(amount)
        self.update_student(student)
        return student

    def bulk_grant_xp(self, student_ids: Iterable[int], amount: int) -> List[Student]:
        updated_students: List[Student] = []
        for student_id in student_ids:
            updated_students.append(self.grant_xp(student_id, amount))
        return updated_students

    def get_student(self, student_id: int) -> Optional[Student]:
        with closing(self._connection.cursor()) as cur:
            cur.execute("SELECT * FROM students WHERE student_id=?", (student_id,))
            row = cur.fetchone()
        if row is None:
            return None
        student = Student(
            student_id=row["student_id"],
            display_name=row["display_name"],
            avatar_svg=row["avatar_svg"],
            xp=row["xp"],
            level=row["level"],
        )
        student.badges.extend(self.get_badges_for_student(student.student_id))
        return student

    def list_students(self) -> List[Student]:
        with closing(self._connection.cursor()) as cur:
            cur.execute("SELECT * FROM students ORDER BY display_name COLLATE NOCASE")
            rows = cur.fetchall()
        students = [
            Student(
                student_id=row["student_id"],
                display_name=row["display_name"],
                avatar_svg=row["avatar_svg"],
                xp=row["xp"],
                level=row["level"],
            )
            for row in rows
        ]
        badges_by_student = self._load_badges_grouped()
        for student in students:
            student.badges.extend(badges_by_student.get(student.student_id, []))
        return students

    # ------------------------------------------------------------------
    # Badge helpers
    # ------------------------------------------------------------------
    def award_badge(self, student_id: int, name: str, description: str, svg_icon: str) -> Badge:
        awarded_at = datetime.utcnow().isoformat()
        with closing(self._connection.cursor()) as cur:
            cur.execute(
                """
                INSERT INTO badges(student_id, name, description, svg_icon, awarded_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (student_id, name, description, svg_icon, awarded_at),
            )
            badge_id = cur.lastrowid
            self._connection.commit()
        return Badge(
            badge_id=badge_id,
            name=name,
            description=description,
            svg_icon=svg_icon,
            awarded_at=datetime.fromisoformat(awarded_at),
        )

    def get_badges_for_student(self, student_id: int) -> List[Badge]:
        with closing(self._connection.cursor()) as cur:
            cur.execute(
                "SELECT * FROM badges WHERE student_id=? ORDER BY datetime(awarded_at) DESC",
                (student_id,),
            )
            rows = cur.fetchall()
        return [
            Badge(
                badge_id=row["badge_id"],
                name=row["name"],
                description=row["description"],
                svg_icon=row["svg_icon"],
                awarded_at=datetime.fromisoformat(row["awarded_at"]),
            )
            for row in rows
        ]

    def _load_badges_grouped(self) -> dict[int, List[Badge]]:
        with closing(self._connection.cursor()) as cur:
            cur.execute("SELECT * FROM badges ORDER BY student_id")
            rows = cur.fetchall()
        grouped: dict[int, List[Badge]] = {}
        for row in rows:
            badge = Badge(
                badge_id=row["badge_id"],
                name=row["name"],
                description=row["description"],
                svg_icon=row["svg_icon"],
                awarded_at=datetime.fromisoformat(row["awarded_at"]),
            )
            grouped.setdefault(row["student_id"], []).append(badge)
        return grouped

    # ------------------------------------------------------------------
    # Reward helpers
    # ------------------------------------------------------------------
    def ensure_default_rewards(self) -> None:
        if self.list_rewards():
            return
        defaults = [
            ("Mutiger Beitrag", 10, "primary", "Für eine mutige Wortmeldung"),
            ("Teamgeist", 20, "success", "Hilft einem Teamkameraden"),
            ("Goldstern", 50, "warning", "Außergewöhnliche Leistung"),
        ]
        for label, xp_amount, color_role, description in defaults:
            self.add_reward(label, xp_amount, color_role, description)

    def add_reward(self, label: str, xp_amount: int, color_role: str, description: str | None = None) -> Reward:
        with closing(self._connection.cursor()) as cur:
            cur.execute(
                "INSERT INTO rewards(label, xp_amount, color_role, description) VALUES (?, ?, ?, ?)",
                (label, xp_amount, color_role, description),
            )
            reward_id = cur.lastrowid
            self._connection.commit()
        return Reward(
            reward_id=reward_id,
            label=label,
            xp_amount=xp_amount,
            color_role=color_role,
            description=description,
        )

    def list_rewards(self) -> List[Reward]:
        with closing(self._connection.cursor()) as cur:
            cur.execute("SELECT * FROM rewards ORDER BY xp_amount")
            rows = cur.fetchall()
        return [
            Reward(
                reward_id=row["reward_id"],
                label=row["label"],
                xp_amount=row["xp_amount"],
                color_role=row["color_role"],
                description=row["description"],
            )
            for row in rows
        ]

    # ------------------------------------------------------------------
    def close(self) -> None:
        self._connection.close()
