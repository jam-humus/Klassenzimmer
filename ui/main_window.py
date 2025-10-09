"""Main window wiring all redesigned tabs together."""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from PyQt5.QtWidgets import QApplication, QMainWindow, QTabWidget

from data.store import DataStore
from ui.rewards_tab import RewardsTab
from ui.students_tab import StudentsTab
from ui.theme import apply_global_palette
from ui.trophy_cabinet import TrophyCabinetTab


class MainWindow(QMainWindow):
    def __init__(self, store: Optional[DataStore] = None) -> None:
        super().__init__()
        self.setWindowTitle("ClassQuest – Kinderfreundliches Dashboard")
        self.resize(1280, 800)

        self.store = store or DataStore(Path("classquest.db"))

        self.tabs = QTabWidget()
        self.setCentralWidget(self.tabs)

        self.students_tab = StudentsTab(self.store)
        self.trophy_tab = TrophyCabinetTab(self.store)
        self.rewards_tab = RewardsTab(self.store)

        self.tabs.addTab(self.students_tab, "Schüler:innen")
        self.tabs.addTab(self.trophy_tab, "Trophäenschrank")
        self.tabs.addTab(self.rewards_tab, "Belohnungen")

    def closeEvent(self, event) -> None:  # type: ignore[override]
        self.store.close()
        super().closeEvent(event)


def run() -> None:
    import sys

    app = QApplication(sys.argv)
    apply_global_palette(app)
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    run()
