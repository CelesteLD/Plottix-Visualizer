import pandas as pd
from io import BytesIO
from parsers.iparser import IParser


class ExcelParser(IParser):
    """Concrete strategy: parses Excel files (.xlsx, .xls)."""

    @property
    def supported_extensions(self) -> list[str]:
        return ["xlsx", "xls"]

    def parse(self, file: BytesIO) -> pd.DataFrame:
        try:
            df = pd.read_excel(file)
            return df
        except Exception as e:
            raise ValueError(f"ExcelParser error: {e}")
