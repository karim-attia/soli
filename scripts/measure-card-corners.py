#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path

GEOMETRY_PATTERN = re.compile(r'^(?P<width>\d+)x(?P<height>\d+)\+(?P<x>-?\d+)\+(?P<y>-?\d+)$')


@dataclass(frozen=True)
class Bounds:
  x: int
  y: int
  width: int
  height: int

  @property
  def top(self) -> int:
    return self.y

  @property
  def bottom(self) -> int:
    return self.y + self.height - 1

  @property
  def center_y(self) -> float:
    return self.y + (self.height - 1) / 2


def parse_geometry(geometry: str) -> Bounds:
  match = GEOMETRY_PATTERN.match(geometry.strip())
  if not match:
    raise ValueError(f'Invalid geometry: {geometry!r}')
  return Bounds(
    x=int(match.group('x')),
    y=int(match.group('y')),
    width=int(match.group('width')),
    height=int(match.group('height')),
  )


def run_magick(*args: str) -> str:
  magick_path = shutil.which('magick')
  if magick_path is None:
    raise RuntimeError('ImageMagick `magick` was not found on PATH.')
  result = subprocess.run(
    [magick_path, *args],
    check=True,
    capture_output=True,
    text=True,
  )
  return result.stdout.strip()


def measure_region_bbox(
  image_path: Path,
  *,
  crop_geometry: Bounds,
  region_geometry: Bounds,
  threshold: int,
  debug_output: Path | None,
) -> Bounds:
  command = [
    str(image_path),
    '-crop',
    f'{crop_geometry.width}x{crop_geometry.height}+{crop_geometry.x}+{crop_geometry.y}',
    '+repage',
    '-crop',
    f'{region_geometry.width}x{region_geometry.height}+{region_geometry.x}+{region_geometry.y}',
    '+repage',
    '-alpha',
    'off',
    '-colorspace',
    'Gray',
    '-threshold',
    f'{threshold}%',
    '-negate',
    '-trim',
    '-format',
    '%@',
    'info:',
  ]
  geometry = run_magick(*command)
  relative_bounds = parse_geometry(geometry)
  absolute_bounds = Bounds(
    x=region_geometry.x + relative_bounds.x,
    y=region_geometry.y + relative_bounds.y,
    width=relative_bounds.width,
    height=relative_bounds.height,
  )

  if debug_output is not None:
    run_magick(
      str(image_path),
      '-crop',
      f'{crop_geometry.width}x{crop_geometry.height}+{crop_geometry.x}+{crop_geometry.y}',
      '+repage',
      '-crop',
      f'{region_geometry.width}x{region_geometry.height}+{region_geometry.x}+{region_geometry.y}',
      '+repage',
      '-alpha',
      'off',
      '-colorspace',
      'Gray',
      '-threshold',
      f'{threshold}%',
      '-negate',
      str(debug_output),
    )

  return absolute_bounds


def build_region(crop_bounds: Bounds, *, side: str) -> Bounds:
  region_height = round(crop_bounds.height * 0.32)
  if side == 'left':
    return Bounds(x=0, y=0, width=round(crop_bounds.width * 0.42), height=region_height)
  return Bounds(
    x=round(crop_bounds.width * 0.54),
    y=0,
    width=crop_bounds.width - round(crop_bounds.width * 0.54),
    height=region_height,
  )


def main() -> None:
  parser = argparse.ArgumentParser(
    description='Measure top-left rank vs top-right suit alignment from a cropped card region in a screenshot.',
  )
  parser.add_argument('--image', required=True, type=Path, help='Path to the screenshot to analyze.')
  parser.add_argument(
    '--card-geometry',
    required=True,
    help='Crop geometry for the target card as WIDTHxHEIGHT+X+Y in screenshot coordinates.',
  )
  parser.add_argument(
    '--threshold',
    type=int,
    default=82,
    help='Gray threshold percentage used to isolate foreground glyph pixels.',
  )
  parser.add_argument(
    '--debug-dir',
    type=Path,
    help='Optional directory where intermediate mask crops are written.',
  )
  args = parser.parse_args()

  crop_bounds = parse_geometry(args.card_geometry)
  left_region = build_region(crop_bounds, side='left')
  right_region = build_region(crop_bounds, side='right')

  debug_dir = args.debug_dir
  if debug_dir is not None:
    debug_dir.mkdir(parents=True, exist_ok=True)

  rank_bounds = measure_region_bbox(
    args.image,
    crop_geometry=crop_bounds,
    region_geometry=left_region,
    threshold=args.threshold,
    debug_output=debug_dir / 'rank-mask.png' if debug_dir else None,
  )
  suit_bounds = measure_region_bbox(
    args.image,
    crop_geometry=crop_bounds,
    region_geometry=right_region,
    threshold=args.threshold,
    debug_output=debug_dir / 'suit-mask.png' if debug_dir else None,
  )

  result = {
    'card': asdict(crop_bounds),
    'rank': asdict(rank_bounds),
    'suit': asdict(suit_bounds),
    'top_diff': suit_bounds.top - rank_bounds.top,
    'bottom_diff': suit_bounds.bottom - rank_bounds.bottom,
    'center_diff': round(suit_bounds.center_y - rank_bounds.center_y, 2),
    'right_gap': crop_bounds.width - (suit_bounds.x + suit_bounds.width),
  }
  print(json.dumps(result, indent=2))


if __name__ == '__main__':
  main()
