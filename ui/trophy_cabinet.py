"""Trophy cabinet displaying earned badges as large cards."""
from __future__ import annotations

from typing import List, Optional

from PyQt5.QtCore import Qt, pyqtSignal
from PyQt5.QtSvg import QSvgWidget
from PyQt5.QtWidgets import (
    QDialog,
    QDialogButtonBox,
    QFrame,
    QGridLayout,
    QScrollArea,
    QVBoxLayout,
    QLabel,
    QWidget,
)

from data.models import Badge
from data.store import DataStore
from ui.theme import FONT_SIZES, make_font


class BadgeDetailDialog(QDialog):
    def __init__(self, badge: Badge, parent: Optional[QWidget] = None) -> None:
        super().__init__(parent)
        self.setWindowTitle(badge.name)
        self.setModal(True)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)

        svg_widget = QSvgWidget()
        svg_widget.load(bytes(badge.svg_icon, "utf-8"))
        svg_widget.setFixedSize(192, 192)
        layout.addWidget(svg_widget, alignment=Qt.AlignCenter)

        name_label = QLabel(badge.name)
        name_label.setFont(make_font(FONT_SIZES["subheading"], bold=True))
        name_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(name_label)

        desc_label = QLabel(badge.description)
        desc_label.setWordWrap(True)
        desc_label.setFont(make_font(FONT_SIZES["body"]))
        layout.addWidget(desc_label)

        awarded_label = QLabel(badge.awarded_at.strftime("Verliehen am %d.%m.%Y um %H:%M"))
        awarded_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(awarded_label)

        buttons = QDialogButtonBox(QDialogButtonBox.Ok)
        buttons.accepted.connect(self.accept)
        layout.addWidget(buttons)


class TrophyCard(QFrame):
    clicked = pyqtSignal(Badge)

    def __init__(self, badge: Badge, parent: Optional[QWidget] = None) -> None:
        super().__init__(parent)
        self.badge = badge
        self.setFrameShape(QFrame.StyledPanel)
        self.setStyleSheet(
            "QFrame { background: #FFFFFF; border-radius: 24px; border: 4px solid #DBEAFE; }"
            "QFrame:hover { border-color: #3B82F6; }"
        )
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(12)
        layout.setAlignment(Qt.AlignCenter)

        svg_widget = QSvgWidget()
        svg_widget.load(bytes(badge.svg_icon, "utf-8"))
        svg_widget.setFixedSize(160, 160)
        layout.addWidget(svg_widget, alignment=Qt.AlignCenter)

        caption = QLabel(badge.name)
        caption.setFont(make_font(FONT_SIZES["body"], bold=True))
        caption.setAlignment(Qt.AlignCenter)
        layout.addWidget(caption)

        subtitle = QLabel(badge.description)
        subtitle.setWordWrap(True)
        subtitle.setAlignment(Qt.AlignCenter)
        subtitle.setFont(make_font(FONT_SIZES["caption"]))
        layout.addWidget(subtitle)

    def mousePressEvent(self, event) -> None:  # type: ignore[override]
        if event.button() == Qt.LeftButton:
            self.clicked.emit(self.badge)
        super().mousePressEvent(event)


class TrophyCabinetTab(QWidget):
    def __init__(self, store: DataStore, parent: Optional[QWidget] = None) -> None:
        super().__init__(parent)
        self.store = store

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)

        header = QLabel("Trophäenschrank")
        header.setFont(make_font(FONT_SIZES["heading"], bold=True))
        layout.addWidget(header)

        self.scroll_area = QScrollArea()
        self.scroll_area.setWidgetResizable(True)
        layout.addWidget(self.scroll_area)

        container = QWidget()
        self.grid = QGridLayout(container)
        self.grid.setSpacing(24)
        self.grid.setContentsMargins(12, 12, 12, 12)
        self.scroll_area.setWidget(container)

        self.refresh()

    def refresh(self) -> None:
        badges = self._collect_badges()
        while self.grid.count():
            item = self.grid.takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()

        if not badges:
            empty = QLabel("Noch keine Orden – verteile Belohnungen!")
            empty.setFont(make_font(FONT_SIZES["body"], bold=True))
            empty.setAlignment(Qt.AlignCenter)
            self.grid.addWidget(empty, 0, 0)
            return

        for index, badge in enumerate(badges):
            card = TrophyCard(badge)
            card.clicked.connect(self._show_details)
            row = index // 3
            col = index % 3
            self.grid.addWidget(card, row, col)

    def _collect_badges(self) -> List[Badge]:
        badges: List[Badge] = []
        for student in self.store.list_students():
            badges.extend(student.badges)
        return badges

    def _show_details(self, badge: Badge) -> None:
        dialog = BadgeDetailDialog(badge, self)
        dialog.exec_()
