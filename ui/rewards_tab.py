"""Rewards tab for granting XP using large buttons."""
from __future__ import annotations

from typing import List

from PyQt5.QtCore import Qt
from PyQt5.QtWidgets import (
    QGridLayout,
    QLabel,
    QListWidget,
    QListWidgetItem,
    QMessageBox,
    QPushButton,
    QSplitter,
    QVBoxLayout,
    QWidget,
)

from data.models import Reward
from data.store import DataStore
from ui.theme import FONT_SIZES, button_style, make_font


class RewardsTab(QWidget):
    def __init__(self, store: DataStore, parent: Optional[QWidget] = None) -> None:
        super().__init__(parent)
        self.store = store

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)

        header = QLabel("Belohnungen")
        header.setFont(make_font(FONT_SIZES["heading"], bold=True))
        layout.addWidget(header)

        splitter = QSplitter(Qt.Horizontal)
        splitter.setChildrenCollapsible(False)
        layout.addWidget(splitter, stretch=1)

        left_container = QWidget()
        left_layout = QVBoxLayout(left_container)
        left_layout.setSpacing(12)

        left_label = QLabel("Wähle mehrere Schüler:innen")
        left_label.setFont(make_font(FONT_SIZES["body"], bold=True))
        left_layout.addWidget(left_label)

        self.student_list = QListWidget()
        self.student_list.setSelectionMode(QListWidget.MultiSelection)
        left_layout.addWidget(self.student_list)

        splitter.addWidget(left_container)

        right_container = QWidget()
        right_layout = QVBoxLayout(right_container)
        right_layout.setSpacing(24)

        right_label = QLabel("XP vergeben")
        right_label.setFont(make_font(FONT_SIZES["body"], bold=True))
        right_layout.addWidget(right_label)

        self.button_grid = QGridLayout()
        self.button_grid.setSpacing(24)
        right_layout.addLayout(self.button_grid)

        splitter.addWidget(right_container)
        splitter.setStretchFactor(0, 1)
        splitter.setStretchFactor(1, 1)

        layout.addStretch(1)

        self._load_students()
        self._load_rewards()

    def _load_students(self) -> None:
        self.student_list.clear()
        for student in self.store.list_students():
            item = QListWidgetItem(student.display_name)
            item.setData(Qt.UserRole, student.student_id)
            item.setFlags(item.flags() | Qt.ItemIsUserCheckable | Qt.ItemIsEnabled)
            item.setCheckState(Qt.Unchecked)
            item.setFont(make_font(20, bold=True))
            self.student_list.addItem(item)

    def _load_rewards(self) -> None:
        self.store.ensure_default_rewards()
        rewards = self.store.list_rewards()
        while self.button_grid.count():
            item = self.button_grid.takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()

        for index, reward in enumerate(rewards):
            button = QPushButton(f"{reward.label}\n+{reward.xp_amount} XP")
            button.setStyleSheet(button_style(reward.color_role))
            button.clicked.connect(lambda _, r=reward: self._grant_reward(r))
            row = index // 2
            col = index % 2
            self.button_grid.addWidget(button, row, col)

    def _selected_student_ids(self) -> List[int]:
        ids: List[int] = []
        for row in range(self.student_list.count()):
            item = self.student_list.item(row)
            if item.checkState() == Qt.Checked:
                student_id = item.data(Qt.UserRole)
                if student_id is not None:
                    ids.append(int(student_id))
        return ids

    def _grant_reward(self, reward: Reward) -> None:
        student_ids = self._selected_student_ids()
        if not student_ids:
            QMessageBox.information(self, "Hinweis", "Bitte wähle mindestens eine:n Schüler:in aus.")
            return
        updated_students = self.store.bulk_grant_xp(student_ids, reward.xp_amount)
        self._load_students()
        QMessageBox.information(
            self,
            "Erfolg",
            f"{len(updated_students)} Schüler:innen haben '{reward.label}' und {reward.xp_amount} XP erhalten!",
        )
