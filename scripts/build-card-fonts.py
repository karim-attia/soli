from __future__ import annotations

import argparse
import shutil
import subprocess
import tempfile
from copy import deepcopy
from dataclasses import dataclass
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.ttLib.scaleUpem import scale_upem
from fontTools.varLib.instancer import instantiateVariableFont

DEFAULT_SOURCE_DIR = Path('/tmp/soli-font-check')
DEFAULT_OUTPUT_DIR = Path('assets/fonts')
RANK_SOURCE_FILE = 'Roboto-Regular.ttf'
SUIT_SOURCE_FILE = 'NotoColorEmoji.ttf'
SUIT_METRICS_SOURCE_FILE = 'NotoSansSymbols-Regular-Subsetted2.ttf'
REGULAR_OUTPUT_FILE = 'CardTextAndroid.ttf'
SEMIBOLD_OUTPUT_FILE = 'CardTextAndroid-SemiBold.ttf'
BOLD_OUTPUT_FILE = 'CardTextAndroid-Bold.ttf'
RANK_TEXT = 'A1234567890JQK'
SUIT_TEXT = '♠♣♥♦'
CARD_TEXT = RANK_TEXT + SUIT_TEXT
MERGED_FAMILY_NAME = 'CardTextAndroid'
REGULAR_STYLE_NAME = 'Regular'
SEMIBOLD_STYLE_NAME = 'SemiBold'
BOLD_STYLE_NAME = 'Bold'


@dataclass(frozen=True)
class FontVariant:
  file_name: str
  style_name: str
  weight_class: int


FONT_VARIANTS = (
  FontVariant(REGULAR_OUTPUT_FILE, REGULAR_STYLE_NAME, 400),
  FontVariant(SEMIBOLD_OUTPUT_FILE, SEMIBOLD_STYLE_NAME, 600),
  FontVariant(BOLD_OUTPUT_FILE, BOLD_STYLE_NAME, 700),
)


def rename_font(
  font: TTFont,
  *,
  family_name: str,
  style_name: str,
  full_name: str,
  postscript_name: str,
  weight_class: int,
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

  font['OS/2'].usWeightClass = weight_class
  font['OS/2'].fsSelection &= ~(0x20 | 0x40)
  if weight_class >= 700:
    font['OS/2'].fsSelection |= 0x20
    font['head'].macStyle |= 0x01
  else:
    font['head'].macStyle &= ~0x01
    if weight_class == 400:
      font['OS/2'].fsSelection |= 0x40


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


def build_rank_font(source_path: Path, weight_class: int) -> TTFont:
  rank_font = TTFont(source_path)
  rank_font = instantiateVariableFont(
    rank_font,
    {'wght': weight_class},
    updateFontNames=False,
    static=True,
  )
  rank_subsetter = build_subsetter()
  rank_subsetter.populate(text=RANK_TEXT)
  rank_subsetter.subset(rank_font)
  return rank_font


def build_suit_font(source_path: Path) -> TTFont:
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

    return TTFont(generated_font_path)


def build_suit_metrics_font(source_path: Path | None) -> TTFont | None:
  if source_path is None or not source_path.exists():
    return None
  metrics_font = TTFont(source_path)
  metrics_subsetter = build_subsetter()
  metrics_subsetter.populate(text=SUIT_TEXT)
  metrics_subsetter.subset(metrics_font)
  return metrics_font


def glyph_name_for_codepoint(font: TTFont, codepoint: int) -> str | None:
  for table in font['cmap'].tables:
    if table.isUnicode() and codepoint in table.cmap:
      return table.cmap[codepoint]
  return None


def normalize_suit_metrics_from_symbol_font(suit_font: TTFont, symbol_font: TTFont) -> None:
  target_upem = suit_font['head'].unitsPerEm
  source_upem = symbol_font['head'].unitsPerEm
  scale = target_upem / source_upem

  for character in SUIT_TEXT:
    codepoint = ord(character)
    suit_glyph_name = glyph_name_for_codepoint(suit_font, codepoint)
    symbol_glyph_name = glyph_name_for_codepoint(symbol_font, codepoint)
    if suit_glyph_name is None or symbol_glyph_name is None:
      raise ValueError(f'Missing glyph for {character!r} while normalizing suit metrics.')

    advance_width, left_side_bearing = symbol_font['hmtx'].metrics[symbol_glyph_name]
    suit_font['hmtx'].metrics[suit_glyph_name] = (
      round(advance_width * scale),
      round(left_side_bearing * scale),
    )

def merge_rank_glyphs_into_suit_font(rank_font: TTFont, suit_font: TTFont) -> TTFont:
  target_upem = suit_font['head'].unitsPerEm
  scale_upem(rank_font, target_upem)

  new_order = suit_font.getGlyphOrder()[:]
  for character in RANK_TEXT:
    codepoint = ord(character)
    rank_glyph_name = glyph_name_for_codepoint(rank_font, codepoint)
    if rank_glyph_name is None:
      raise ValueError(f'Missing glyph for {character!r} in the rank font subset.')

    merged_glyph_name = f'card_{rank_glyph_name}'
    if merged_glyph_name not in suit_font['glyf'].glyphs:
      suit_font['glyf'][merged_glyph_name] = deepcopy(rank_font['glyf'][rank_glyph_name])
      suit_font['hmtx'].metrics[merged_glyph_name] = rank_font['hmtx'].metrics[rank_glyph_name]
      new_order.append(merged_glyph_name)

    for cmap_table in suit_font['cmap'].tables:
      if cmap_table.isUnicode():
        cmap_table.cmap[codepoint] = merged_glyph_name

  suit_font.setGlyphOrder(new_order)
  suit_font['maxp'].numGlyphs = len(new_order)
  suit_font['hhea'].numberOfHMetrics = len(suit_font['hmtx'].metrics)
  return suit_font


def build_merged_card_font_variants(
  rank_source_path: Path,
  suit_source_path: Path,
  suit_metrics_source_path: Path | None,
  output_dir: Path,
) -> None:
  suit_metrics_font = build_suit_metrics_font(suit_metrics_source_path)

  for variant in FONT_VARIANTS:
    rank_font = build_rank_font(rank_source_path, variant.weight_class)
    suit_font = build_suit_font(suit_source_path)
    if suit_metrics_font is not None:
      normalize_suit_metrics_from_symbol_font(suit_font, deepcopy(suit_metrics_font))
    merged_font = merge_rank_glyphs_into_suit_font(rank_font, suit_font)
    full_name = (
      MERGED_FAMILY_NAME
      if variant.style_name == REGULAR_STYLE_NAME
      else f'{MERGED_FAMILY_NAME} {variant.style_name}'
    )
    postscript_name = (
      MERGED_FAMILY_NAME
      if variant.style_name == REGULAR_STYLE_NAME
      else f'{MERGED_FAMILY_NAME}-{variant.style_name}'
    )
    rename_font(
      merged_font,
      family_name=MERGED_FAMILY_NAME,
      style_name=variant.style_name,
      full_name=full_name,
      postscript_name=postscript_name,
      weight_class=variant.weight_class,
    )
    merged_font.save(output_dir / variant.file_name)


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(
    description='Generate a single Android-derived card font with Roboto rank glyphs and Android suit glyphs.',
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
  suit_metrics_source_path = source_dir / SUIT_METRICS_SOURCE_FILE

  if not rank_source_path.exists():
    raise FileNotFoundError(f'Missing rank font source: {rank_source_path}')
  if not suit_source_path.exists():
    raise FileNotFoundError(f'Missing suit font source: {suit_source_path}')

  output_dir.mkdir(parents=True, exist_ok=True)
  build_merged_card_font_variants(
    rank_source_path,
    suit_source_path,
    suit_metrics_source_path if suit_metrics_source_path.exists() else None,
    output_dir,
  )

  for variant in FONT_VARIANTS:
    print(output_dir / variant.file_name)


if __name__ == '__main__':
  main()
