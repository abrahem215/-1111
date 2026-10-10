#!/usr/bin/env python3
"""
AirType AI — لوحة الكتابة في الهواء
Main desktop executable entry point.
"""

import sys
import os

# Ensure desktop package is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from PySide6.QtWidgets import QApplication
from PySide6.QtGui import QFont
from ui.main_window import MainWindow


def main():
    app = QApplication(sys.argv)
    app.setApplicationName("AirType AI")
    app.setOrganizationName("AirType")

    # Set default font
    font = QFont("Cairo", 10)
    app.setFont(font)

    window = MainWindow()
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
