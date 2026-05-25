"use client";
import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  Bookmark, Send, Phone, Users, Trophy, XCircle,
  MoreHorizontal, Trash2, StickyNote, AlertTriangle
} from "lucide-react";
import { cn, formatRelativeDate, formatDate, isClosingSoon } from "@/lib/utils";
import { ScoreBadge } from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import type { PipelineItem, PipelineStage, PIPELINE_STAGES } from "@/types";
import { PIPELINE_STAGES as STAGES } from "@/types";
import { useAppStore } from "@/store/useAppStore";
import toast from "react-hot-toast";

const STAGE_ICONS: Record<PipelineStage, React.ElementType> = {
  saved: Bookmark,
  applied: Send,
  phone_screen: Phone,
  interview: Users,
  offer: Trophy,
  rejected: XCircle,
};

const STAGE_COLORS: Record<PipelineStage, string> = {
  saved: "text-signal-cyan border-signal-cyan/20 bg-signal-cyan/10",
  applied: "text-blue-400 border-blue-400/20 bg-blue-400/10",
  phone_screen: "text-signal-violet border-signal-violet/20 bg-signal-violet/10",
  interview: "text-amber-400 border-amber-400/20 bg-amber-400/10",
  offer: "text-emerald-400 border-emerald-400/20 bg-emerald-400/10",
  rejected: "text-red-400 border-red-400/20 bg-red-400/10",
};

export default function KanbanBoard() {
  const { pipelineItems, setPipelineItems, updatePipelineItem, removePipelineItem } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");

  useEffect(() => {
    fetch("/api/pipeline")
      .then((r) => r.json())
      .then((data) => {
        if (data.items) setPipelineItems(data.items);
      })
      .catch(() => toast.error("Failed to load pipeline"))
      .finally(() => setIsLoading(false));
  }, []);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;

    const newStage = destination.droppableId as PipelineStage;
    const item = pipelineItems.find((i) => i.id === draggableId);
    if (!item || item.stage === newStage) return;

    updatePipelineItem(draggableId, { stage: newStage });

    try {
      await fetch(`/api/pipeline/${draggableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
    } catch {
      // Revert
      updatePipelineItem(draggableId, { stage: item.stage });
      toast.error("Failed to move card");
    }
  };

  const handleDelete = async (itemId: string) => {
    removePipelineItem(itemId);
    try {
      await fetch(`/api/pipeline/${itemId}`, { method: "DELETE" });
      toast("Removed from pipeline");
    } catch {
      toast.error("Failed to remove");
    }
  };

  const handleSaveNotes = async (itemId: string) => {
    updatePipelineItem(itemId, { notes: notesText });
    setEditingNotes(null);
    try {
      await fetch(`/api/pipeline/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesText }),
      });
    } catch {
      toast.error("Failed to save notes");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const stageItems = (stage: PipelineStage) =>
    pipelineItems.filter((i) => i.stage === stage);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-200px)]">
        {STAGES.map((stage) => {
          const items = stageItems(stage.id);
          const Icon = STAGE_ICONS[stage.id];

          return (
            <div key={stage.id} className="flex-shrink-0 w-72">
              {/* Column Header */}
              <div className={cn(
                "mb-3 flex items-center justify-between rounded-xl border px-3 py-2.5",
                STAGE_COLORS[stage.id]
              )}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{stage.label}</span>
                </div>
                <span className="text-xs opacity-70 font-mono">{items.length}</span>
              </div>

              {/* Droppable Zone */}
              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "min-h-32 rounded-xl border border-dashed border-white/[0.06] p-2 transition-all",
                      snapshot.isDraggingOver && "border-signal-cyan/30 bg-signal-cyan/5"
                    )}
                  >
                    {items.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "kanban-card mb-2 rounded-xl border border-white/[0.06] bg-signal-surface p-3 transition-all",
                              snapshot.isDragging
                                ? "border-signal-cyan/30 shadow-signal rotate-1 scale-105"
                                : "hover:border-white/[0.12]"
                            )}
                          >
                            {/* Job Title + Company */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="truncate text-sm font-medium text-gray-200">
                                  {item.job?.title ?? "Unknown Job"}
                                </p>
                                <p className="truncate text-xs text-gray-500 mt-0.5">
                                  {item.job?.company}
                                </p>
                              </div>
                              <ScoreBadge score={item.job?.matchScore} size="sm" />
                            </div>

                            {/* Location */}
                            {item.job?.location && (
                              <p className="mt-1.5 text-xs text-gray-600 truncate">
                                📍 {item.job.location}
                              </p>
                            )}

                            {/* Closing Soon Warning */}
                            {isClosingSoon(item.deadline ?? undefined) && (
                              <div className="mt-2 flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs text-amber-400">
                                <AlertTriangle className="h-3 w-3" />
                                Deadline: {formatDate(item.deadline ?? undefined)}
                              </div>
                            )}

                            {/* Notes Preview */}
                            {item.notes && editingNotes !== item.id && (
                              <p className="mt-2 line-clamp-2 text-xs text-gray-600 italic">
                                "{item.notes}"
                              </p>
                            )}

                            {/* Notes Editor */}
                            {editingNotes === item.id && (
                              <div className="mt-2">
                                <textarea
                                  value={notesText}
                                  onChange={(e) => setNotesText(e.target.value)}
                                  className="w-full rounded-lg border border-white/[0.08] bg-signal-bg/50 p-2 text-xs text-gray-300 resize-none focus:outline-none focus:border-signal-cyan/30"
                                  rows={3}
                                  placeholder="Add notes…"
                                  autoFocus
                                />
                                <div className="mt-1 flex gap-1">
                                  <button
                                    onClick={() => handleSaveNotes(item.id)}
                                    className="rounded px-2 py-1 text-xs bg-signal-cyan/20 text-signal-cyan hover:bg-signal-cyan/30"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingNotes(null)}
                                    className="rounded px-2 py-1 text-xs text-gray-500 hover:text-gray-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Footer Actions */}
                            <div className="mt-2 flex items-center justify-between border-t border-white/[0.04] pt-2">
                              <span className="text-[10px] text-gray-600">
                                {formatRelativeDate(item.updatedAt)}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setNotesText(item.notes ?? "");
                                    setEditingNotes(item.id);
                                  }}
                                  className="rounded p-1 text-gray-600 hover:text-gray-400 transition-colors"
                                  title="Add notes"
                                >
                                  <StickyNote className="h-3 w-3" />
                                </button>
                                {item.job?.applicationUrl && (
                                  <a
                                    href={item.job.applicationUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded p-1 text-gray-600 hover:text-signal-cyan transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Open job"
                                  >
                                    <MoreHorizontal className="h-3 w-3" />
                                  </a>
                                )}
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="rounded p-1 text-gray-600 hover:text-red-400 transition-colors"
                                  title="Remove"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {items.length === 0 && !snapshot.isDraggingOver && (
                      <div className="flex h-20 items-center justify-center text-xs text-gray-600">
                        Drop cards here
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
