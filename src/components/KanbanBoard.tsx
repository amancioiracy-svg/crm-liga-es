import React, { useState } from 'react';
import { Lead, PIPELINE_COLUMNS, ColumnStatus, CustomTag } from '../types';
import { KanbanCard } from './KanbanCard';

interface KanbanBoardProps {
  leads: Lead[];
  tags?: CustomTag[];
  onOpenDetails: (lead: Lead) => void;
  onMoveColumn: (leadId: string, newColumn: ColumnStatus) => void;
  onShowToast: (msg: string) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  leads,
  tags = [],
  onOpenDetails,
  onMoveColumn,
  onShowToast
}) => {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnStatus | null>(null);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    setDraggedLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent, col: ColumnStatus) => {
    e.preventDefault();
    if (dragOverColumn !== col) {
      setDragOverColumn(col);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetCol: ColumnStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (leadId) {
      onMoveColumn(leadId, targetCol);
      onShowToast(`Lead movido para "${targetCol}"`);
    }
    setDraggedLeadId(null);
    setDragOverColumn(null);
  };

  return (
    <div className="w-full overflow-x-auto pb-6 pt-1">
      <div className="inline-flex gap-3.5 min-w-max items-start">
        {PIPELINE_COLUMNS.map((colName) => {
          const colLeads = leads.filter((l) => {
            const matchedCol = PIPELINE_COLUMNS.includes(l.columnStatus) ? l.columnStatus : 'Leads';
            return matchedCol === colName;
          });
          const isOver = dragOverColumn === colName;

          return (
            <div
              key={colName}
              onDragOver={(e) => handleDragOver(e, colName)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, colName)}
              className={`w-72 min-w-[260px] max-w-[280px] shrink-0 rounded-xl p-2.5 transition-colors duration-150 flex flex-col min-h-[520px] ${
                isOver
                  ? 'bg-blue-50/80 border-2 border-dashed border-blue-400'
                  : 'bg-neutral-100/70 border border-neutral-200/60'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-neutral-200/80 px-1">
                <span className="text-xs font-semibold text-neutral-700 tracking-tight">
                  {colName}
                </span>

                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-semibold text-neutral-600 bg-white border border-neutral-200 rounded-full shadow-2xs">
                  {colLeads.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
                {colLeads.length === 0 ? (
                  <div className="h-28 border border-dashed border-neutral-300 rounded-lg flex items-center justify-center text-[11px] text-neutral-400 select-none">
                    Arraste cards aqui
                  </div>
                ) : (
                  colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <KanbanCard
                        lead={lead}
                        tags={tags}
                        onOpenDetails={onOpenDetails}
                        onMoveColumn={onMoveColumn}
                        onShowToast={onShowToast}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
