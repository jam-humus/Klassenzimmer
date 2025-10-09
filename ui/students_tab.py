"""Student detail tab with large avatar and progress information."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from PyQt5.QtCore import Qt
from PyQt5.QtSvg import QSvgWidget
from PyQt5.QtWidgets import (
    QFrame,
    QGridLayout,
    QLabel,
    QListWidget,
    QListWidgetItem,
    QProgressBar,
    QPushButton,
    QSplitter,
    QVBoxLayout,
    QWidget,
    QSizePolicy,
)

from data.models import Badge, Student
from data.store import DataStore
from ui.theme import FONT_SIZES, button_style, make_font
from ui.vector_assets import AVATAR_SVG, BADGE_SVGS


class AvatarPanel(QFrame):
    def __init__(self, parent: Optional[QWidget] = None) -> None:
        super().__init__(parent)
        self.setFrameShape(QFrame.NoFrame)
        layout = QVBoxLayout(self)
        layout.setAlignment(Qt.AlignCenter)

        self.avatar_widget = QSvgWidget()
        self.avatar_widget.load(bytes(AVATAR_SVG, "utf-8"))
        self.avatar_widget.setMinimumSize(360, 360)
        self.avatar_widget.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)

        layout.addWidget(self.avatar_widget, alignment=Qt.AlignCenter)


class BadgeGallery(QWidget):
    def __init__(self, parent: Optional[QWidget] = None) -> None:
        super().__init__(parent)
        layout = QGridLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setHorizontalSpacing(24)
        layout.setVerticalSpacing(24)
        self._layout = layout

    def populate(self, badges: List[Badge]) -> None:
        while self._layout.count():
            item = self._layout.takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()
        for index, badge in enumerate(badges):
            row = index // 3
            col = index % 3
            badge_widget = QSvgWidget()
            badge_widget.load(bytes(badge.svg_icon, "utf-8"))
            badge_widget.setFixedSize(128, 128)
            caption = QLabel(badge.name)
            caption.setAlignment(Qt.AlignCenter)
            caption.setFont(make_font(FONT_SIZES["body"], bold=True))

            card = QWidget()
            card_layout = QVBoxLayout(card)
            card_layout.setAlignment(Qt.AlignCenter)
            card_layout.addWidget(badge_widget, alignment=Qt.AlignCenter)
            card_layout.addWidget(caption)

            self._layout.addWidget(card, row, col)


class StudentDetail(QWidget):
    def __init__(self, parent: Optional[QWidget] = None) -> None:
        super().__init__(parent)
        splitter = QSplitter(Qt.Horizontal, self)
        splitter.setChildrenCollapsible(False)
        splitter.setHandleWidth(12)
        splitter.setStyleSheet("QSplitter::handle { background: #CBD5F5; }")

        self.avatar_panel = AvatarPanel()
        splitter.addWidget(self.avatar_panel)

        self.info_panel = QWidget()
        info_layout = QVBoxLayout(self.info_panel)
        info_layout.setSpacing(16)
        info_layout.setContentsMargins(24, 24, 24, 24)

        self.name_label = QLabel("Schüler:in")
        self.name_label.setFont(make_font(28, bold=True))

        self.level_label = QLabel("Level 1")
        self.level_label.setFont(make_font(FONT_SIZES["heading"], bold=True))

        self.xp_label = QLabel("0 XP")
        self.xp_label.setFont(make_font(FONT_SIZES["heading"], bold=True))

        self.progress = QProgressBar()
        self.progress.setRange(0, 100)
        self.progress.setTextVisible(True)
        self.progress.setFormat("Fortschritt zum nächsten Level: %p%")
        self.progress.setStyleSheet(
            "QProgressBar { border-radius: 16px; height: 36px; font-size: 16px; }"
            "QProgressBar::chunk { background-color: #10B981; border-radius: 16px; }"
        )

        info_layout.addWidget(self.name_label)
        info_layout.addWidget(self.level_label)
        info_layout.addWidget(self.xp_label)
        info_layout.addWidget(self.progress)

        badge_header = QLabel("Orden")
        badge_header.setFont(make_font(FONT_SIZES["subheading"], bold=True))
        info_layout.addWidget(badge_header)

        self.badge_gallery = BadgeGallery()
        info_layout.addWidget(self.badge_gallery)
        info_layout.addStretch(1)

        splitter.addWidget(self.info_panel)
        splitter.setStretchFactor(0, 1)
        splitter.setStretchFactor(1, 1)
        splitter.setSizes([600, 600])

        layout = QVBoxLayout(self)
        layout.addWidget(splitter)

    def update_student(self, student: Student) -> None:
        self.name_label.setText(student.display_name)
        self.level_label.setText(f"Level {student.level}")
        self.xp_label.setText(f"{student.xp} XP")
        progress = student.xp % 100
        self.progress.setValue(progress)
        if not student.badges:
            placeholder = Badge(
                badge_id=-1,
                name="Noch keine Orden",
                description="Sammle XP, um Orden freizuschalten!",
                svg_icon=BADGE_SVGS["star"],
                awarded_at=datetime.utcnow(),
            )
            self.badge_gallery.populate([placeholder])
        else:
            self.badge_gallery.populate(student.badges)


class StudentsTab(QWidget):
    def __init__(self, store: DataStore, parent: Optional[QWidget] = None) -> None:
        super().__init__(parent)
        self.store = store
        self.current_student: Optional[Student] = None

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)

        header = QLabel("Schüler:innen")
        header.setFont(make_font(FONT_SIZES["heading"], bold=True))
        layout.addWidget(header)

        self.student_list = QListWidget()
        self.student_list.setSpacing(12)
        self.student_list.setFixedHeight(140)
        self.student_list.itemSelectionChanged.connect(self._on_selection_changed)
        layout.addWidget(self.student_list)

        self.detail = StudentDetail()
        layout.addWidget(self.detail, stretch=1)

        self.refresh_button = QPushButton("Neu laden")
        self.refresh_button.setStyleSheet(button_style("secondary"))
        self.refresh_button.clicked.connect(self.reload_students)
        layout.addWidget(self.refresh_button, alignment=Qt.AlignRight)

        self.reload_students()

    def reload_students(self) -> None:
        students = self.store.list_students()
        if not students:
            demo_student = self.store.add_student("Alex Abenteuer", AVATAR_SVG)
            self.store.ensure_default_rewards()
            students = [self.store.get_student(demo_student.student_id)]  # type: ignore[list-item]

        self.student_list.clear()
        for student in students:
            if student is None:
                continue
            item = QListWidgetItem(student.display_name)
            item.setData(Qt.UserRole, student.student_id)
            font = make_font(20, bold=True)
            item.setFont(font)
            self.student_list.addItem(item)

        if students:
            self.student_list.setCurrentRow(0)

    def _on_selection_changed(self) -> None:
        selected_items = self.student_list.selectedItems()
        if not selected_items:
            return
        student_id = selected_items[0].data(Qt.UserRole)
        if student_id is None:
            return
        student = self.store.get_student(student_id)
        if student is None:
            return
        self.current_student = student
        self.detail.update_student(student)
