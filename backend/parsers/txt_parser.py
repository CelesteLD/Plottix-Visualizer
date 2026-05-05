import pandas as pd
from io import BytesIO
from parsers.iparser import IParser


class TXTParser(IParser):
    """Concrete strategy: parses whitespace/tab-delimited TXT files."""

    @property
    def supported_extensions(self) -> list[str]:
        return ["txt", "tsv"]

    def parse(self, file: BytesIO) -> pd.DataFrame:
        try:
            content = file.read()
            # Try tab first, then any whitespace
            for sep in ["\t", r"\s+"]:
                try:
                    df = pd.read_csv(BytesIO(content), sep=sep, engine="python")
                    if len(df.columns) > 1:
                        return df
                except Exception:
                    continue
            raise ValueError("Could not parse TXT file — check delimiter.")
        except Exception as e:
            raise ValueError(f"TXTParser error: {e}")
