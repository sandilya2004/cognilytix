import { useState, useCallback } from "react";
import { Plus, Trash2, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ParsedData } from "@/lib/data-processing";

interface SpreadsheetEditorProps {
  data: ParsedData;
  onDataChange: (data: ParsedData) => void;
}

// Simple formula evaluation: =SUM(col), =AVG(col), =COUNT(col), =MIN(col), =MAX(col), or plain numbers
function evaluateFormula(value: string, rows: Record<string, unknown>[]): string | number {
  if (typeof value !== "string" || !value.startsWith("=")) return value;
  const formula = value.toUpperCase().trim();

  const match = formula.match(/^=(SUM|AVG|AVERAGE|COUNT|MIN|MAX)\(([^)]+)\)$/);
  if (!match) return value;

  const [, func, colName] = match;
  const col = colName.trim();
  const nums = rows.map(r => Number(r[col])).filter(n => !isNaN(n));

  if (nums.length === 0) return "#ERR";

  switch (func) {
    case "SUM": return Math.round(nums.reduce((a, b) => a + b, 0) * 100) / 100;
    case "AVG":
    case "AVERAGE": return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
    case "COUNT": return nums.length;
    case "MIN": return Math.min(...nums);
    case "MAX": return Math.max(...nums);
    default: return value;
  }
}

export default function SpreadsheetEditor({ data, onDataChange }: SpreadsheetEditorProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newColName, setNewColName] = useState("");
  const [showAddCol, setShowAddCol] = useState(false);

  const updateCell = useCallback((rowIdx: number, colName: string, value: string) => {
    const newRows = [...data.rows];
    const evaluated = evaluateFormula(value, data.rows);
    newRows[rowIdx] = { ...newRows[rowIdx], [colName]: evaluated };
    onDataChange({ ...data, rows: newRows });
  }, [data, onDataChange]);

  const addRow = useCallback(() => {
    const emptyRow: Record<string, unknown> = {};
    data.columns.forEach(c => { emptyRow[c.name] = ""; });
    onDataChange({ ...data, rows: [...data.rows, emptyRow] });
  }, [data, onDataChange]);

  const deleteRow = useCallback((idx: number) => {
    const newRows = data.rows.filter((_, i) => i !== idx);
    onDataChange({ ...data, rows: newRows });
  }, [data, onDataChange]);

  const addColumn = useCallback(() => {
    if (!newColName.trim()) return;
    const name = newColName.trim();
    const newCols = [...data.columns, { name, type: "string" as const }];
    const newRows = data.rows.map(r => ({ ...r, [name]: "" }));
    onDataChange({ columns: newCols, rows: newRows, rawHeaders: [...data.rawHeaders, name] });
    setNewColName("");
    setShowAddCol(false);
  }, [data, onDataChange, newColName]);

  const startEdit = (rowIdx: number, colName: string) => {
    setEditingCell({ row: rowIdx, col: colName });
    setEditValue(String(data.rows[rowIdx][colName] ?? ""));
  };

  const commitEdit = () => {
    if (editingCell) {
      updateCell(editingCell.row, editingCell.col, editValue);
      setEditingCell(null);
    }
  };

  // Show max 50 rows in editor
  const displayRows = data.rows.slice(0, 50);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Spreadsheet Editor</h3>
          <span className="text-xs text-muted-foreground">Click any cell to edit · Use =SUM(col), =AVG(col), =MIN(col), =MAX(col)</span>
        </div>
        <div className="flex items-center gap-2">
          {showAddCol ? (
            <div className="flex items-center gap-1">
              <input
                className="h-7 w-28 rounded border border-border bg-background px-2 text-xs"
                placeholder="Column name"
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addColumn()}
                autoFocus
              />
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addColumn}>Add</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAddCol(false)}>Cancel</Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAddCol(true)}>
              <Plus className="h-3 w-3 mr-1" /> Column
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addRow}>
            <Plus className="h-3 w-3 mr-1" /> Row
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted/50">
              <th className="px-2 py-2 text-left font-medium text-muted-foreground w-8">#</th>
              {data.columns.map(col => (
                <th key={col.name} className="px-3 py-2 text-left font-medium text-foreground whitespace-nowrap min-w-[100px]">
                  {col.name}
                </th>
              ))}
              <th className="px-2 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-t border-border hover:bg-muted/20">
                <td className="px-2 py-1 text-xs text-muted-foreground">{rowIdx + 1}</td>
                {data.columns.map(col => {
                  const isEditing = editingCell?.row === rowIdx && editingCell?.col === col.name;
                  return (
                    <td key={col.name} className="px-1 py-0.5">
                      {isEditing ? (
                        <input
                          className="w-full h-7 rounded border border-primary bg-background px-2 text-xs focus:outline-none"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingCell(null); }}
                          autoFocus
                        />
                      ) : (
                        <div
                          className="px-2 py-1 text-xs text-muted-foreground cursor-pointer rounded hover:bg-primary/5 min-h-[28px] flex items-center"
                          onClick={() => startEdit(rowIdx, col.name)}
                        >
                          {row[col.name] != null ? String(row[col.name]) : "—"}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="px-1 py-0.5">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteRow(rowIdx)}>
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.rows.length > 50 && (
        <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
          Showing first 50 of {data.rows.length} rows for editing
        </div>
      )}
    </div>
  );
}
