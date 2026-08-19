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
  const [activeMobileColumn, setActiveMobileColumn] = useState<ColumnStatus | 'ALL'>('ALL');

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
    <div className="w-full pb-6 pt-1">
      {/* MOBILE / NARROW COLUMN TABS - Fast switching (< xl) */}
      <div className="xl:hidden flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-3 scrollbar-none border-b border-neutral-200">
        <button
          onClick={() => setActiveMobileColumn('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 flex items-center gap-1.5 ${
            activeMobileColumn === 'ALL'
              ? 'bg-neutral-900 text-white shadow-2xs'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          <span>Todas ({leads.length})</span>
        </button>

        {PIPELINE_COLUMNS.map((colName) => {
          const colCount = leads.filter((l) => {
            const matchedCol = PIPELINE_COLUMNS.includes(l.columnStatus) ? l.columnStatus : 'Leads';
            return matchedCol === colName;
          }).length;

          const isActive = activeMobileColumn === colName;

          return (
            <button
              key={colName}
              onClick={() => setActiveMobileColumn(colName)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 flex items-center gap-1.5 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <span>{colName}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                isActive ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'
              }`}>
                {colCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* KANBAN COLUMNS CONTAINER */}
      <div className="w-full overflow-x-auto">
        <div className="inline-flex gap-3.5 min-w-full xl:min-w-max items-start">
          {PIPELINE_COLUMNS.map((colName) => {
            const colLeads = leads.filter((l) => {
              const matchedCol = PIPELINE_COLUMNS.includes(l.columnStatus) ? l.columnStatus : 'Leads';
              return matchedCol === colName;
            });
            const isOver = dragOverColumn === colName;

            // On narrow screens (< xl), if a specific column is selected, show only that column full-width
            const isHiddenOnMobile = activeMobileColumn !== 'ALL' && activeMobileColumn !== colName;

            return (
              <div
                key={colName}
                onDragOver={(e) => handleDragOver(e, colName)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, colName)}
                className={`${isHiddenOnMobile ? 'hidden xl:flex' : 'flex'} w-full xl:w-72 xl:min-w-[260px] xl:max-w-[280px] shrink-0 rounded-xl p-2.5 transition-colors duration-150 flex-col min-h-[480px] xl:min-h-[520px] ${
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
                      Nenhum lead nesta coluna
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
    </div>
  );
};

