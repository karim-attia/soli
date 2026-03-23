from __future__ import annotations

import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

DEFAULT_SOURCE_DIR = Path('/tmp/soli-font-check')
DEFAULT_OUTPUT_DIR = Path('assets/fonts')
RANK_SOURCE_FILE = 'Roboto-Regular.ttf'
SUIT_SOURCE_FILE = 'NotoColorEmoji.ttf'
RANK_OUTPUT_FILE = 'CardRankAndroidBold.ttf'
SUIT_OUTPUT_FILE = 'CardSuitAndroidEmoji.ttf'
RANK_TEXT = 'A234567890JQK'
SUIT_TEXT = '♠♣♥♦'
RANK_WEIGHT = 700
RANK_FAMILY_NAME = 'CardRankAndroidBold'
SUIT_FAMILY_NAME = 'CardSuitAndroidEmoji'
REGULAR_STYLE_NAME = 'Regular'


def rename_font(
  font: TTFont,
  *,
  family_name: str,
  style_name: str,
  full_name: str,
  postscript_name: str,
) -> None:
  name_table = font['name']
  for platform_id, plat_enc_id, lang_id in (
    (3, 1, 0x409),
    (1, 0, 0),
  ):
    name_table.setName(family_name, 1, platform_id, plat_enc_id, lang_id)
    name_table.setName(style_name, 2, platform_id, plat_enc_id, lang_id)
    name_table.setName(full_name, 4, platform_id, plat_enc_id, lang_id)
    name_table.setName(postscript_name, 6, platform_id, plat_enc_id, lang_id)
    name_table.setName(family_name, 16, platform_id, plat_enc_id, lang_id)
    name_table.setName(style_name, 17, platform_id, plat_enc_id, lang_id)


def build_subsetter() -> subset.Subsetter:
  options = subset.Options()
  options.name_IDs = ['*']
  options.name_legacy = True
  options.name_languages = ['*']
  return subset.Subsetter(options=options)


def require_tool(name: str) -> str:
  tool_path = shutil.which(name)
  if tool_path:
    return tool_path
  raise RuntimeError(
    f'Missing required tool `{name}` in PATH. '
    'Install the nanoemoji toolchain in a virtualenv before running this script.'
  )


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
  rename_font(
    rank_font,
    family_name=RANK_FAMILY_NAME,
    style_name=REGULAR_STYLE_NAME,
    full_name=RANK_FAMILY_NAME,
    postscript_name=RANK_FAMILY_NAME,
  )
  rank_font.save(output_path)


def copy_suit_font(source_path: Path, output_path: Path) -> None:
  with tempfile.TemporaryDirectory(prefix='soli-suit-font-') as temp_dir_name:
    temp_dir = Path(temp_dir_name)
    subset_path = temp_dir / 'subset.ttf'
    build_dir = temp_dir / 'build'

    suit_font = TTFont(source_path)
    suit_subsetter = build_subsetter()
    suit_subsetter.populate(text=SUIT_TEXT)
    suit_subsetter.subset(suit_font)
    suit_font.save(subset_path)

    maximum_color_path = require_tool('maximum_color')
    subprocess.run(
      [
        maximum_color_path,
        '--build_dir',
        str(build_dir),
        str(subset_path),
      ],
      check=True,
      cwd=temp_dir,
    )

    generated_font_path = build_dir / 'Font.ttf'
    if not generated_font_path.exists():
      raise FileNotFoundError(
        f'Expected nanoemoji output at {generated_font_path}, but it was not created.'
      )

    shutil.copyfile(generated_font_path, output_path)

  suit_font = TTFont(output_path)
  rename_font(
    suit_font,
    family_name=SUIT_FAMILY_NAME,
    style_name=REGULAR_STYLE_NAME,
    full_name=SUIT_FAMILY_NAME,
    postscript_name=SUIT_FAMILY_NAME,
  )
  suit_font.save(output_path)


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(
    description='Generate the Android-derived bold rank font and copy the Android color emoji suit font.',
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
  suit_source_path = source_dir / SUIT_SOURCE_FILE

  if not rank_source_path.exists():
    raise FileNotFoundError(f'Missing rank font source: {rank_source_path}')
  if not suit_source_path.exists():
    raise FileNotFoundError(f'Missing suit font source: {suit_source_path}')

  output_dir.mkdir(parents=True, exist_ok=True)
  rank_output_path = output_dir / RANK_OUTPUT_FILE
  suit_output_path = output_dir / SUIT_OUTPUT_FILE

  generate_rank_font(rank_source_path, rank_output_path)
  copy_suit_font(suit_source_path, suit_output_path)

  print(rank_output_path)
  print(suit_output_path)


if __name__ == '__main__':
  main()
