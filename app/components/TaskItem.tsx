import { Task } from "../types";

interface TaskItemProps {
  task: Task;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  return (
    <li className="flex items-center gap-3 py-3 border-b border-gray-200 dark:border-gray-700">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        className="h-4 w-4 rounded border-gray-300 accent-blue-500 dark:border-gray-600"
      />
      <span className={`flex-1 break-words ${task.completed ? "line-through text-gray-400 dark:text-gray-600" : ""}`}>
        {task.text}
      </span>
      <button
        onClick={() => onDelete(task.id)}
        className="text-red-500 hover:text-red-700 text-sm dark:text-red-400 dark:hover:text-red-300"
      >
        Delete
      </button>
    </li>
  );
}
