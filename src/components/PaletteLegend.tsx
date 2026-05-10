import type { MaterialItem } from "../types/bead";

interface PaletteLegendProps {
  materials: MaterialItem[];
}

export default function PaletteLegend({ materials }: PaletteLegendProps) {
  if (materials.length === 0) {
    return (
      <section className="panel">
        <div className="section-title-row">
          <div>
            <h2>色盘图例</h2>
            <p>暂无颜色</p>
          </div>
        </div>

        <p className="empty-text">生成图纸后，这里会显示本次实际用到的颜色。</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="section-title-row">
        <div>
          <h2>色盘图例</h2>
          <p>只展示本次图纸实际用到的颜色</p>
        </div>

        <span className="size-badge">{materials.length} 色</span>
      </div>

      <div className="legend-list">
        {materials.map((item) => (
          <div className="legend-item" key={`${item.brand}-${item.code}`}>
            <span
              className="legend-color"
              style={{ backgroundColor: item.hex }}
            />

            <div className="legend-text">
              <strong>
                {item.code} {item.name}
              </strong>
              <span>{item.count} 颗</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}