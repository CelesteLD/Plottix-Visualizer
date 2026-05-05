"""
Parser Factory — automatically registers all IParser implementations.
To add a new format: create a class that extends IParser and add it here.
"""
from parsers.iparser import IParser
from parsers.csv_parser import CSVParser
from parsers.txt_parser import TXTParser
from parsers.excel_parser import ExcelParser


class ParserFactory:
    _registry: dict[str, IParser] = {}

    @classmethod
    def _build_registry(cls):
        if cls._registry:
            return
        for parser in [CSVParser(), TXTParser(), ExcelParser()]:
            for ext in parser.supported_extensions:
                cls._registry[ext] = parser

    @classmethod
    def get_parser(cls, extension: str) -> IParser:
        cls._build_registry()
        parser = cls._registry.get(extension.lower())
        if not parser:
            supported = list(cls._registry.keys())
            raise ValueError(
                f"No parser found for extension '{extension}'. "
                f"Supported: {supported}"
            )
        return parser

    @classmethod
    def supported_extensions(cls) -> list[str]:
        cls._build_registry()
        return list(cls._registry.keys())
