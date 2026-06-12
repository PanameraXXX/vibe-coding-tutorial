import { useState, type FormEvent } from 'react';

interface Props {
  onAdd: (title: string) => void;
}

// 顶部输入框，回车或点按钮提交
export function TodoInput({ onAdd }: Props) {
  const [value, setValue] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const t = value.trim();
    if (!t) return;
    onAdd(t);
    setValue('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <input
        className="flex-1 border rounded px-3 py-2"
        placeholder="想做点什么..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        添加
      </button>
    </form>
  );
}
