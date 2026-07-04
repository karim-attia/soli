from __future__ import annotations

import argparse
import hashlib
import math
from dataclasses import dataclass
from pathlib import Path

from fontTools.ttLib import TTFont

DEFAULT_REFERENCE_PATH = Path('/tmp/soli-Roboto-Regular.ttf')
DEFAULT_EMOJI_REFERENCE_PATH = Path('/tmp/soli-NotoColorEmoji.ttf')
DEFAULT_FONT_DIR = Path('assets/fonts')
USE_TYPO_METRICS_BIT = 1 << 7
SUIT_CHARACTERS = '♠♣♥♦'


@dataclass(frozen=True)
class CardFontPatchTarget:
  file_name: str
  weight_label: str


CARD_FONT_PATCH_TARGETS = (
  CardFontPatchTarget('CardTextAndroid.ttf', '400'),
  CardFontPatchTarget('CardTextAndroid-SemiBold.ttf', '600'),
  CardFontPatchTarget('CardTextAndroid-Bold.ttf', '700'),
)


@dataclass(frozen=True)
class FontMetrics:
  upem: int
  hhea: tuple[int, int, int]
  os2_typo: tuple[int, int, int]
  os2_win: tuple[int, int]
  fs_selection: int
  # (yMax, yMin): Android/Skia derive FontMetrics top/bottom from the font bounding
  # box, and RN's default includeFontPadding positions first-line text with exactly
  # those values. This is the metric that actually moves card glyphs on Android.
  head_bbox_y: tuple[int, int]

  @property
  def uses_typo_metrics(self) -> bool:
    return bool(self.fs_selection & USE_TYPO_METRICS_BIT)


def rounded_scaled(value: int, scale: float) -> int:
  return int(math.copysign(math.floor(abs(value) * scale + 0.5), value))


def read_metrics(font: TTFont) -> FontMetrics:
  head = font['head']
  hhea = font['hhea']
  os2 = font['OS/2']
  return FontMetrics(
    upem=head.unitsPerEm,
    hhea=(hhea.ascent, hhea.descent, hhea.lineGap),
    os2_typo=(os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap),
    os2_win=(os2.usWinAscent, os2.usWinDescent),
    fs_selection=os2.fsSelection,
    head_bbox_y=(head.yMax, head.yMin),
  )


def scaled_reference_metrics(reference_font: TTFont, target_upem: int) -> FontMetrics:
  reference = read_metrics(reference_font)
  scale = target_upem / reference.upem
  return FontMetrics(
    upem=target_upem,
    hhea=tuple(rounded_scaled(value, scale) for value in reference.hhea),
    os2_typo=tuple(rounded_scaled(value, scale) for value in reference.os2_typo),
    os2_win=tuple(rounded_scaled(value, scale) for value in reference.os2_win),
    fs_selection=reference.fs_selection,
    head_bbox_y=tuple(rounded_scaled(value, scale) for value in reference.head_bbox_y),
  )


def snapshot_unchanged_data(font: TTFont) -> dict[str, object]:
  suit_glyph_names = {
    font.getBestCmap().get(ord(character)) for character in SUIT_CHARACTERS
  }
  return {
    'glyph_order': tuple(font.getGlyphOrder()),
    # Suit hmtx entries are intentionally rewritten from the emoji reference; every
    # other glyph's metrics must stay byte-identical.
    'non_suit_hmtx': tuple(
      sorted(
        (name, metrics)
        for name, metrics in font['hmtx'].metrics.items()
        if name not in suit_glyph_names
      )
    ),
    'names': tuple(
      (
        record.nameID,
        record.platformID,
        record.platEncID,
        record.langID,
        bytes(record.string),
      )
      for record in font['name'].names
    ),
  }


def sha256(path: Path) -> str:
  return hashlib.sha256(path.read_bytes()).hexdigest()


def normalize_os2_metrics_from_reference(font: TTFont, reference_font: TTFont) -> None:
  target = scaled_reference_metrics(reference_font, font['head'].unitsPerEm)

  os2 = font['OS/2']
  os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap = target.os2_typo
  os2.usWinAscent, os2.usWinDescent = target.os2_win

  # Android's approved fallback used Roboto without USE_TYPO_METRICS. Keep each
  # variant's style bits, but mirror only Roboto's choice for this layout-critical bit.
  if target.uses_typo_metrics:
    os2.fsSelection |= USE_TYPO_METRICS_BIT
  else:
    os2.fsSelection &= ~USE_TYPO_METRICS_BIT

  # 2026-07-03 learning: patching OS/2 alone did NOT move Android rendering. RN's
  # includeFontPadding takes first-line top from the font *bounding box* (head.yMax via
  # Skia/FreeType), so the merged font's emoji-derived bbox (0.9014em vs Roboto's
  # 1.0562em) made card text sit ~0.155em too high. Widening the bbox to Roboto's
  # scaled values restores the approved fallback position; it cannot clip glyphs
  # because the box only grows. Requires saving with recalcBBoxes=False, otherwise
  # fontTools recomputes the bbox from glyph outlines and undoes this patch.
  head = font['head']
  head.yMax, head.yMin = target.head_bbox_y

  # 2026-07-04 learning: iOS/CoreText places the first line from hhea ascender, while
  # Android uses the bbox above. With hhea at Roboto's 0.9277em, iOS card text sat
  # 0.129em higher than the Android/approved rendering. Setting hhea to the same
  # bbox-derived values makes every metric a platform might read agree, so both
  # platforms render identically. Android provably ignores hhea for this path (the
  # bbox patch alone fixed it while hhea was still 950/-250).
  hhea = font['hhea']
  hhea.ascent, hhea.descent = target.head_bbox_y
  hhea.lineGap = 0


def normalize_suit_advances_from_emoji(font: TTFont, emoji_font: TTFont) -> None:
  # 2026-07-04 learning: the approved Android fallback rendered suits from the phone's
  # NotoColorEmoji, which gives every suit the same advance width (1275 @ upem 1024).
  # PBI-33 instead copied per-suit advances from NotoSansSymbols (♦1129..♥1276), so the
  # centered center-suit text box put the visible ink up to ~5.5px off-center (worst
  # for ♦) and shifted the top-right corner suit. The drawings themselves already match
  # the emoji source, so copying its hmtx entries restores exact fallback placement.
  scale = font['head'].unitsPerEm / emoji_font['head'].unitsPerEm
  cmap = font.getBestCmap()
  emoji_cmap = emoji_font.getBestCmap()
  for character in SUIT_CHARACTERS:
    glyph_name = cmap.get(ord(character))
    emoji_glyph_name = emoji_cmap.get(ord(character))
    if glyph_name is None or emoji_glyph_name is None:
      raise ValueError(f'Missing suit glyph for {character!r} while normalizing advances.')
    advance, lsb = emoji_font['hmtx'].metrics[emoji_glyph_name]
    font['hmtx'].metrics[glyph_name] = (rounded_scaled(advance, scale), rounded_scaled(lsb, scale))


def drop_vertical_layout_tables(font: TTFont) -> None:
  # The nanoemoji output carried a vhea/vmtx pair whose vmtx became truncated when
  # PBI-33 merged extra glyphs in (fontTools cannot even parse it). Vertical-layout
  # tables are unused for horizontal text on Android/iOS, so dropping them removes a
  # latent parse hazard without any rendering change.
  for tag in ('vhea', 'vmtx'):
    if tag in font:
      del font[tag]


def patch_font(
  font_path: Path,
  reference_font: TTFont,
  emoji_reference_font: TTFont,
) -> tuple[FontMetrics, FontMetrics, str, str]:
  before_hash = sha256(font_path)
  font = TTFont(font_path, recalcBBoxes=False, recalcTimestamp=False)
  before_metrics = read_metrics(font)
  unchanged_before = snapshot_unchanged_data(font)

  normalize_os2_metrics_from_reference(font, reference_font)
  normalize_suit_advances_from_emoji(font, emoji_reference_font)
  drop_vertical_layout_tables(font)
  font.save(font_path)

  after_hash = sha256(font_path)
  after_font = TTFont(font_path, recalcBBoxes=False, recalcTimestamp=False)
  after_metrics = read_metrics(after_font)
  unchanged_after = snapshot_unchanged_data(after_font)
  if unchanged_before != unchanged_after:
    raise ValueError(f'Unexpected glyph/name/hmtx change while patching {font_path}')

  return before_metrics, after_metrics, before_hash, after_hash


def format_metrics(metrics: FontMetrics) -> str:
  return (
    f'upem={metrics.upem}; hhea={metrics.hhea}; '
    f'OS/2 typo={metrics.os2_typo}; OS/2 win={metrics.os2_win}; '
    f'fsSelection={metrics.fs_selection}; USE_TYPO_METRICS={metrics.uses_typo_metrics}; '
    f'head bbox yMax/yMin={metrics.head_bbox_y}'
  )


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(
    description=(
      'Patch CardTextAndroid vertical metrics (OS/2, head bbox, hhea) to match the '
      'scaled phone Roboto and suit advances to match the phone NotoColorEmoji.'
    ),
  )
  parser.add_argument(
    '--reference',
    type=Path,
    default=DEFAULT_REFERENCE_PATH,
    help='Path to Roboto-Regular.ttf pulled from the reference Android phone.',
  )
  parser.add_argument(
    '--emoji-reference',
    type=Path,
    default=DEFAULT_EMOJI_REFERENCE_PATH,
    help='Path to NotoColorEmoji.ttf pulled from the reference Android phone.',
  )
  parser.add_argument(
    '--font-dir',
    type=Path,
    default=DEFAULT_FONT_DIR,
    help='Directory containing CardTextAndroid*.ttf assets.',
  )
  return parser.parse_args()


def main() -> None:
  args = parse_args()
  reference_path = args.reference.expanduser().resolve()
  emoji_reference_path = args.emoji_reference.expanduser().resolve()
  font_dir = args.font_dir.expanduser().resolve()
  if not reference_path.exists():
    raise FileNotFoundError(f'Missing reference font: {reference_path}')
  if not emoji_reference_path.exists():
    raise FileNotFoundError(f'Missing emoji reference font: {emoji_reference_path}')

  reference_font = TTFont(reference_path, recalcBBoxes=False, recalcTimestamp=False)
  reference_metrics = read_metrics(reference_font)
  print(f'Reference {reference_path}: {format_metrics(reference_metrics)}')
  emoji_reference_font = TTFont(emoji_reference_path, recalcBBoxes=False, recalcTimestamp=False)
  emoji_cmap = emoji_reference_font.getBestCmap()
  suit_advances = {
    character: emoji_reference_font['hmtx'].metrics[emoji_cmap[ord(character)]]
    for character in SUIT_CHARACTERS
  }
  print(f'Emoji reference {emoji_reference_path}: suit hmtx {suit_advances}')

  for target in CARD_FONT_PATCH_TARGETS:
    font_path = font_dir / target.file_name
    if not font_path.exists():
      raise FileNotFoundError(f'Missing card font: {font_path}')

    before_metrics, after_metrics, before_hash, after_hash = patch_font(
      font_path, reference_font, emoji_reference_font
    )
    print(f'{target.file_name} ({target.weight_label})')
    print(f'  before sha256={before_hash}; {format_metrics(before_metrics)}')
    print(f'  after  sha256={after_hash}; {format_metrics(after_metrics)}')


if __name__ == '__main__':
  main()
