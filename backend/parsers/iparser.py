"""
Strategy Pattern — Parser Interface
Every concrete parser must implement the `parse` method.
"""
from abc import ABC, abstractmethod
from io import BytesIO
import pandas as pd


class IParser(ABC):
    """Abstract strategy for parsing uploaded dataset files."""

    @abstractmethod
    def parse(self, file: BytesIO) -> pd.DataFrame:
        """
        Parse a binary stream into a pandas DataFrame.

        Args:
            file: Binary stream of the uploaded file.

        Returns:
            A pandas DataFrame with the parsed data.
        """
        ...

    @property
    @abstractmethod
    def supported_extensions(self) -> list[str]:
        """List of file extensions this parser handles, e.g. ['csv']."""
        ...
