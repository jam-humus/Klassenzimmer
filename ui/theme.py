"""Centralised theme configuration for the ClassQuest PyQt5 UI."""
from __future__ import annotations

from PyQt5.QtGui import QColor, QFont

# A Duolingo-inspired, kid-friendly palette with vivid greens and sunshine yellows.
COLOR_PALETTE = {
    "background": QColor("#F4FDF3"),
    "surface": QColor("#FFFFFF"),
    "primary": QColor("#58CC02"),
    "secondary": QColor("#FFD93B"),
    "success": QColor("#2DD4BF"),
    "warning": QColor("#FF6B6B"),
    "text_primary": QColor("#1E293B"),
    "text_secondary": QColor("#475569"),
    "mint": QColor("#B7F0B1"),
    "sky": QColor("#B3E5FC"),
}

FONT_SIZES = {
    "heading": 34,
    "subheading": 24,
    "body": 18,
    "caption": 14,
}


def apply_global_palette(app) -> None:
    app.setStyle("Fusion")
    palette = app.palette()
    palette.setColor(palette.Window, COLOR_PALETTE["background"])
    palette.setColor(palette.Base, COLOR_PALETTE["surface"])
    palette.setColor(palette.Button, COLOR_PALETTE["primary"])
    palette.setColor(palette.WindowText, COLOR_PALETTE["text_primary"])
    palette.setColor(palette.ButtonText, COLOR_PALETTE["surface"])
    palette.setColor(palette.Highlight, COLOR_PALETTE["secondary"])
    palette.setColor(palette.HighlightedText, COLOR_PALETTE["text_primary"])
    app.setPalette(palette)
    app.setStyleSheet(
        """
        QWidget {
            font-family: "Baloo 2", "Arial Rounded MT", "Arial";
            color: #1E293B;
        }
        QScrollArea {
            border: none;
        }
        QListWidget {
            background: #FFFFFF;
            border: 3px solid #C7F9CC;
            border-radius: 18px;
            padding: 8px;
        }
        QListWidget::item {
            padding: 12px;
            border-radius: 12px;
        }
        QListWidget::item:selected {
            background: #E2F8CE;
            color: #1A2E05;
        }
        QListWidget::item:hover {
            background: #F4FDF3;
        }
        QTabBar::tab {
            background: #FFFFFF;
            border: 3px solid #C7F9CC;
            border-bottom: none;
            border-top-left-radius: 18px;
            border-top-right-radius: 18px;
            padding: 12px 24px;
            margin: 0 6px;
            font-weight: 700;
        }
        QTabBar::tab:selected {
            background: #E2F8CE;
            border-color: #58CC02;
        }
        QTabWidget::pane {
            border: 3px solid #C7F9CC;
            border-radius: 18px;
            top: -2px;
        }
        QMessageBox {
            background: #FFFFFF;
        }
        QMessageBox QLabel {
            font-size: 18px;
        }
        """
    )


def make_font(point_size: int, bold: bool = False) -> QFont:
    font = QFont("Baloo 2", point_size)
    font.setBold(bold)
    return font


def button_style(role: str = "primary") -> str:
    color = COLOR_PALETTE.get(role, COLOR_PALETTE["primary"]).name()
    text_color = "#0F172A"
    return f"""
        QPushButton {{
            background-color: {color};
            color: {text_color};
            border: 3px solid {lighten(color, 0.9)};
            border-radius: 20px;
            padding: 16px 28px;
            min-height: 72px;
            font-size: 20px;
            font-weight: 800;
            letter-spacing: 0.5px;
        }}
        QPushButton:pressed {{
            background-color: {lighten(color, 0.9)};
        }}
        QPushButton:disabled {{
            background-color: #DAE5D5;
            color: #94A3B8;
        }}
    """


def card_style(accent: str = "#58CC02", gradient: bool = True) -> str:
    background = (
        f"background: qlineargradient(x1:0 y1:0, x2:1 y2:1,"
        f" stop:0 {lighten(accent, 1.45)}, stop:1 {lighten(accent, 1.15)});"
    ) if gradient else "background: #FFFFFF;"
    return f"""
        QFrame {{
            {background}
            border: 4px solid {lighten(accent, 0.9)};
            border-radius: 24px;
            padding: 20px;
        }}
    """


def lighten(hex_color: str, factor: float) -> str:
    color = QColor(hex_color)
    r = min(int(color.red() * factor), 255)
    g = min(int(color.green() * factor), 255)
    b = min(int(color.blue() * factor), 255)
    return f"#{r:02X}{g:02X}{b:02X}"
