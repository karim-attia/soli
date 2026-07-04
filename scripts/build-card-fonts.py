from __future__ import annotations

import argparse
import math
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
# 2026-07-04: suit hmtx must come from NotoColorEmoji (uniform 1275 advance @ upem 1024),
# the font the approved Android fallback actually used. The earlier NotoSansSymbols
# source gave per-suit advances that left the centered center-suit ink up to ~5.5px
# off-center (worst for ♦). Keep in sync with scripts/patch-card-font-metrics.py.
SUIT_METRICS_SOURCE_FILE = 'NotoColorEmoji.ttf'
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
USE_TYPO_METRICS_BIT = 1 << 7


@dataclass(frozen=True)
class FontVariant:
  file_name: str
  style_name: str
  weight_class: int


@dataclass(frozen=True)
class VerticalMetrics:
  upem: int
  hhea: tuple[int, int, int]
  os2_typo: tuple[int, int, int]
  os2_win: tuple[int, int]
  fs_selection: int
  # (yMax, yMin): the font bounding box drives Android includeFontPadding placement.
  head_bbox_y: tuple[int, int]

  @property
  def uses_typo_metrics(self) -> bool:
    return bool(self.fs_selection & USE_TYPO_METRICS_BIT)


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


def rounded_scaled(value: int, scale: float) -> int:
  return int(math.copysign(math.floor(abs(value) * scale + 0.5), value))


def read_vertical_metrics(font: TTFont) -> VerticalMetrics:
  head = font['head']
  hhea = font['hhea']
  os2 = font['OS/2']
  return VerticalMetrics(
    upem=head.unitsPerEm,
    hhea=(hhea.ascent, hhea.descent, hhea.lineGap),
    os2_typo=(os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap),
    os2_win=(os2.usWinAscent, os2.usWinDescent),
    fs_selection=os2.fsSelection,
    head_bbox_y=(head.yMax, head.yMin),
  )


def scaled_vertical_metrics(reference_font: TTFont, target_upem: int) -> VerticalMetrics:
  reference = read_vertical_metrics(reference_font)
  scale = target_upem / reference.upem
  return VerticalMetrics(
    upem=target_upem,
    hhea=tuple(rounded_scaled(value, scale) for value in reference.hhea),
    os2_typo=tuple(rounded_scaled(value, scale) for value in reference.os2_typo),
    os2_win=tuple(rounded_scaled(value, scale) for value in reference.os2_win),
    fs_selection=reference.fs_selection,
    head_bbox_y=tuple(rounded_scaled(value, scale) for value in reference.head_bbox_y),
  )


def normalize_os2_metrics_from_reference(font: TTFont, reference_font: TTFont) -> None:
  target = scaled_vertical_metrics(reference_font, font['head'].unitsPerEm)

  os2 = font['OS/2']
  os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap = target.os2_typo
  os2.usWinAscent, os2.usWinDescent = target.os2_win

  # Keep this in sync with scripts/patch-card-font-metrics.py: Android registration
  # must retain the approved phone-Roboto fallback padding instead of device fallback.
  if target.uses_typo_metrics:
    os2.fsSelection |= USE_TYPO_METRICS_BIT
  else:
    os2.fsSelection &= ~USE_TYPO_METRICS_BIT

  # head bbox is the metric RN Android actually uses for first-line placement
  # (includeFontPadding -> Skia fTop/fBottom from the font bounding box). The merged
  # emoji-derived bbox (0.9014em) made card text sit ~0.155em higher than the approved
  # Roboto fallback (1.0562em). Only valid when saved with recalcBBoxes=False.
  head = font['head']
  head.yMax, head.yMin = target.head_bbox_y

  # iOS/CoreText places the first line from hhea ascender while Android uses the bbox,
  # so hhea must carry the same bbox-derived values or iOS renders ~0.129em higher.
  # Keep in sync with scripts/patch-card-font-metrics.py.
  hhea = font['hhea']
  hhea.ascent, hhea.descent = target.head_bbox_y
  hhea.lineGap = 0


def drop_vertical_layout_tables(font: TTFont) -> None:
  # nanoemoji emits vhea/vmtx; after merging extra glyphs the vmtx no longer matches the
  # glyph count and is unparseable. Vertical-layout tables are unused for our horizontal
  # text, so drop them instead of shipping a corrupt table.
  for tag in ('vhea', 'vmtx'):
    if tag in font:
      del font[tag]


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


# 2026-07-04: the former expand_suit_advance_widths_to_fit_svg_artwork step (SVG xMax +
# right padding) was removed. Advances must stay exactly the NotoColorEmoji values or
# the centered/right-aligned suit text boxes shift the visible ink; ink wider than the
# advance is fine because RN does not clip glyph overflow horizontally.
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
    # Two-phase save: the first save lets fontTools recalculate glyph/head bboxes for
    # the merged glyphs; the reopened font is saved with recalcBBoxes=False so the
    # Roboto-derived head bbox from the normalization survives.
    output_path = output_dir / variant.file_name
    merged_font.save(output_path)
    saved_font = TTFont(output_path, recalcBBoxes=False, recalcTimestamp=False)
    normalize_os2_metrics_from_reference(saved_font, rank_font)
    drop_vertical_layout_tables(saved_font)
    saved_font.save(output_path)


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
