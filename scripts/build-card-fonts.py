from __future__ import annotations

import argparse
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

RANK_TEXT = 'A234567890JQK'
DEFAULT_SOURCE_DIR = Path('/tmp/soli-font-check')
DEFAULT_OUTPUT_DIR = Path('assets/fonts')
RANK_SOURCE_FILE = 'Roboto-Regular.ttf'
RANK_OUTPUT_FILE = 'CardRankRoboto700.ttf'
RANK_WEIGHT = 700


def build_subsetter() -> subset.Subsetter:
  options = subset.Options()
  options.name_IDs = ['*']
  options.name_legacy = True
  options.name_languages = ['*']
  return subset.Subsetter(options=options)


def generate_rank_font(source_path: Path, output_path: Path) -> None:
  rank_font = TTFont(source_path)
  rank_font = instantiateVariableFont(
    rank_font,
    {'wght': RANK_WEIGHT},
    updateFontNames=True,
    static=True,
  )
  rank_subsetter = build_subsetter()
  rank_subsetter.populate(text=RANK_TEXT)
  rank_subsetter.subset(rank_font)
  rank_font.save(output_path)


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(
    description='Generate the explicit Android-derived rank font used by card ranks.',
  )
  parser.add_argument(
    '--source-dir',
    type=Path,
    default=DEFAULT_SOURCE_DIR,
    help='Directory containing pulled Android source fonts.',
  )
  parser.add_argument(
    '--output-dir',
    type=Path,
    default=DEFAULT_OUTPUT_DIR,
    help='Directory to write generated card font assets into.',
  )
  return parser.parse_args()


def main() -> None:
  args = parse_args()
  source_dir = args.source_dir.expanduser().resolve()
  output_dir = args.output_dir.expanduser().resolve()
  rank_source_path = source_dir / RANK_SOURCE_FILE

  if not rank_source_path.exists():
    raise FileNotFoundError(f'Missing rank font source: {rank_source_path}')

  output_dir.mkdir(parents=True, exist_ok=True)
  rank_output_path = output_dir / RANK_OUTPUT_FILE

  generate_rank_font(rank_source_path, rank_output_path)

  print(rank_output_path)


if __name__ == '__main__':
  main()
