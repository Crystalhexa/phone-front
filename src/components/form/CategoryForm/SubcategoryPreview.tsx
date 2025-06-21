import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { X, GripVertical } from 'lucide-react';
import { SubcategoryPreviewProps } from '@/types/form';

export const SubcategoryPreview: React.FC<SubcategoryPreviewProps> = ({
  subcategories,
  onRemove,
  onReorder,
  enableDragDrop = false,
}) => {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !onReorder) return;

    onReorder(result.source.index, result.destination.index);
  };

  const SubcategoryTag: React.FC<{ subcategory: string; index: number }> = ({
    subcategory,
    index
  }) => (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 group">
      {enableDragDrop && (
        <GripVertical className="w-3 h-3 mr-1 text-blue-600 dark:text-blue-300 opacity-50 group-hover:opacity-100" />
      )}
      <span className="max-w-[150px] truncate" title={subcategory}>
        {subcategory}
      </span>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-600 hover:bg-blue-200 hover:text-blue-800 dark:text-blue-300 dark:hover:bg-blue-800 dark:hover:text-blue-100 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
        aria-label={`Remove ${subcategory}`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );

  if (subcategories.length === 0) return null;

  return (
    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Preview ({subcategories.length} subcategories):
        </p>
        {subcategories.length > 0 && (
          <button
            type="button"
            onClick={() => subcategories.forEach((_, index) => onRemove(index))}
            className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
          >
            Clear All
          </button>
        )}
      </div>

      {enableDragDrop && onReorder ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable
            droppableId="subcategories"
            direction="horizontal"
            isDropDisabled={!enableDragDrop} // ✅ This ensures it’s always a boolean
          >
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex flex-wrap gap-2"
              >
                {subcategories.map((subcategory, index) => (
                  <Draggable
                    key={`${subcategory}-${index}`}
                    draggableId={`subcategory-${index}`}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`${snapshot.isDragging ? 'shadow-lg' : ''}`}
                      >
                        <SubcategoryTag subcategory={subcategory} index={index} />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

        </DragDropContext>
      ) : (
        <div className="flex flex-wrap gap-2">
          {subcategories.map((subcategory, index) => (
            <SubcategoryTag key={`${subcategory}-${index}`} subcategory={subcategory} index={index} />
          ))}
        </div>
      )}
    </div>
  );
};