"""Centralised theme configuration for the ClassQuest PyQt5 UI."""
from __future__ import annotations

from PyQt5.QtGui import QColor, QFont

COLOR_PALETTE = {
    "background": QColor("#F8FAFC"),
    "surface": QColor("#FFFFFF"),
    "primary": QColor("#3B82F6"),
    "secondary": QColor("#F59E0B"),
    "success": QColor("#10B981"),
    "warning": QColor("#EF4444"),
    "text_primary": QColor("#0F172A"),
    "text_secondary": QColor("#475569"),
}

FONT_SIZES = {
    "heading": 32,
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
    palette.setColor(palette.HighlightedText, COLOR_PALETTE["surface"])
    app.setPalette(palette)


def make_font(point_size: int, bold: bool = False) -> QFont:
    font = QFont("Baloo 2", point_size)
    font.setBold(bold)
    return font


def button_style(role: str = "primary") -> str:
    color = COLOR_PALETTE.get(role, COLOR_PALETTE["primary"]).name()
    text_color = "#FFFFFF"
    return f"""
        QPushButton {{
            background-color: {color};
            color: {text_color};
            border-radius: 16px;
            padding: 16px 24px;
            min-height: 64px;
            font-size: 20px;
            font-weight: 600;
        }}
        QPushButton:pressed {{
            background-color: {lighten(color, 1.1)};
        }}
        QPushButton:disabled {{
            background-color: #CBD5F5;
            color: #64748B;
        }}
    """


def lighten(hex_color: str, factor: float) -> str:
    color = QColor(hex_color)
    r = min(int(color.red() * factor), 255)
    g = min(int(color.green() * factor), 255)
    b = min(int(color.blue() * factor), 255)
    return f"#{r:02X}{g:02X}{b:02X}"
