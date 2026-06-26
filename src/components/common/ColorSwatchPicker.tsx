import { PALETTE } from '@/utils/palette';

interface Props {
  value: string;
  onChange: (color: string) => void;
}

export default function ColorSwatchPicker({ value, onChange }: Props) {
  return (
    <div className="swatch-grid">
      {PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          className={`swatch${color === value ? ' is-active' : ''}`}
          style={{ background: color }}
          onClick={() => onChange(color)}
          aria-label={`选择颜色 ${color}`}
        />
      ))}
    </div>
  );
}
