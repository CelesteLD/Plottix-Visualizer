import pandas as pd
from io import BytesIO
from parsers.iparser import IParser


class CSVParser(IParser):
    """Concrete strategy: parses CSV files."""

    @property
    def supported_extensions(self) -> list[str]:
        return ["csv"]

    def parse(self, file: BytesIO) -> pd.DataFrame:
        try:
            # Try comma first, then semicolon (European CSVs)
            content = file.read()
            for sep in [",", ";", "\t"]:
                try:
                    df = pd.read_csv(BytesIO(content), sep=sep)
                    if len(df.columns) > 1:
                        return df
                except Exception:
                    continue
            raise ValueError("Could not detect a valid separator for the CSV file.")
        except Exception as e:
            raise ValueError(f"CSVParser error: {e}")
